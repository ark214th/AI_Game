// がめんの きほん：キャンバス・ボタン・おはなし・よく つかう え
import { FONT, INK, rr, circ, ell, star, text, emoji, drawCreature, drawSpeech, heartPath } from '../fushigi-pet-hotel/draw.mjs';
import { nameOf } from './data.mjs';
export { FONT, INK, rr, circ, ell, star, text, emoji, drawCreature, drawSpeech, heartPath };

// ---------- ゲーム ぜんたいで つかう もの ----------
// G.go(なまえ, ひきすう) で がめんを かえる（app.mjs が いれる）
export const G = { save: null, sound: null, go: null, persist: null, day: null, T: 0, talkAt: 'top' };

// ---------- キャンバス ----------
// たて 640 の ざひょうで かく。よこは がめんに あわせて 860〜1400
export const V = { W: 1000, H: 640, S: 1, DPR: 1, cx: 500 };
export let canvas = null, ctx = null;
export function initCanvas(el) {
  canvas = el; ctx = el.getContext('2d');
  const resize = () => {
    const cw = innerWidth, ch = innerHeight;
    V.DPR = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * V.DPR); canvas.height = Math.round(ch * V.DPR);
    V.S = ch / 640; V.W = cw / V.S; V.H = 640;
    if (V.W < 860) { V.S = cw / 860; V.W = 860; V.H = ch / V.S; }
    if (V.W > 1400) { V.W = 1400; }
    V.cx = V.W / 2;
    V.ox = (cw / V.S - V.W) / 2; V.oy = (ch / V.S - V.H) / 2;
  };
  addEventListener('resize', resize);
  resize();
  return ctx;
}
export function beginFrame() {
  ctx.setTransform(V.DPR * V.S, 0, 0, V.DPR * V.S, 0, 0);
  ctx.fillStyle = '#ffe9f1'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(V.ox, V.oy);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, V.W, V.H); ctx.clip();
  hits.length = 0;
}
export function endFrame() { ctx.restore(); }
export const toV = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / V.S - V.ox, y: (e.clientY - r.top) / V.S - V.oy }; };
export const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);

// ---------- ボタン（かくたびに あたりはんいを とうろく） ----------
export const hits = [];
export function button(c, r, label, onTap, { color = '#fff', ink = INK, size = 30, shadow = '#e4c9d4', icon = null, disabled = false, pulse = false, round = null, always = false, tag = '' } = {}) {
  const down = pressed && pressed.r.x === r.x && pressed.r.y === r.y;
  const k = pulse && !disabled ? 1 + Math.sin(G.T * 5) * 0.03 : 1;
  c.save();
  c.translate(r.x + r.w / 2, r.y + r.h / 2); c.scale(k, k); c.translate(-r.w / 2, -r.h / 2 + (down ? 4 : 0));
  c.globalAlpha = disabled ? 0.45 : 1;
  const rad = round ?? Math.min(r.h / 2, 26);
  c.fillStyle = shadow; rr(c, 0, 5, r.w, r.h, rad); c.fill();
  c.fillStyle = color; rr(c, 0, down ? 2 : 0, r.w, r.h, rad); c.fill();
  if (icon && label) { emoji(c, icon, size * 0.9, r.h / 2, size * 1.05); text(c, label, r.w / 2 + size * 0.45, r.h / 2, size, { color: ink }); }
  else if (icon) emoji(c, icon, r.w / 2, r.h / 2, size * 1.2);
  else text(c, label, r.w / 2, r.h / 2, size, { color: ink });
  c.restore();
  if (!disabled && onTap) hits.push({ r, onTap, always, label: tag || label });
}
// あたりはんいだけ（えは じぶんで かく）
export function hitArea(r, onTap, opt = {}) { hits.push({ r, onTap, label: r.label, ...opt }); }
let pressed = null;
// buttonsOnly：おはなしの とちゅうは ふつうの ボタン（おと など）だけ きく
export function pointerDownHits(p, buttonsOnly = false) {
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (buttonsOnly && (h.instant || !h.always)) continue;
    if (inRect(p, h.r)) {
      if (h.instant) { h.onTap(p); return true; }
      pressed = h; return true;
    }
  }
  return false;
}
export function pointerUpHits(p) {
  const h = pressed; pressed = null;
  if (h && inRect(p, { x: h.r.x - 20, y: h.r.y - 20, w: h.r.w + 40, h: h.r.h + 40 })) { G.sound?.play('tap'); h.onTap(p); return true; }
  return !!h;
}
export const isPressing = () => !!pressed;

// ---------- おはなし（したの まど） ----------
// talk([{ who, text, mood }], つぎに すること)
let talkQ = null, talkDone = null, talkT = 0;
export function talk(lines, done) { talkQ = lines.filter(Boolean).map(l => typeof l === 'string' ? { who: null, text: l } : l); talkDone = done || null; talkT = 0; if (!talkQ.length) { talkQ = null; done?.(); } }
export const talking = () => !!talkQ;
export const talkWho = () => talkQ?.[0]?.who || null;
export function talkTap() {
  if (!talkQ) return false;
  if (talkT < 0.25) return true;
  G.sound?.play('tap');
  talkQ.shift(); talkT = 0;
  if (!talkQ.length) { talkQ = null; const d = talkDone; talkDone = null; d?.(); }
  return true;
}
export function updateTalk(dt) { if (talkQ) talkT += dt; }
export function drawTalk(c) {
  if (!talkQ) return;
  const l = talkQ[0];
  const w = Math.min(V.W - 40, 860), h = 124, x = (V.W - w) / 2, y = G.talkAt === 'bottom' ? V.H - h - 16 : 76;
  c.save();
  c.fillStyle = 'rgba(90,61,85,.18)'; rr(c, x, y + 6, w, h, 26); c.fill();
  c.fillStyle = '#fffdf8'; rr(c, x, y, w, h, 26); c.fill();
  c.strokeStyle = '#ffc2d4'; c.lineWidth = 4; rr(c, x, y, w, h, 26); c.stroke();
  let tx = x + 36;
  if (l.who) {
    c.fillStyle = '#ffeef4'; circ(c, x + 74, y + h / 2, 52); c.fill();
    drawCreature(c, l.who, x + 74, y + h / 2 + 40, 38, { t: G.T, mood: l.mood || 'happy', acc: l.who === 'punyu' ? G.save.outfit : null });
    tx = x + 146;
    c.fillStyle = '#ff7aa8'; rr(c, tx - 6, y - 18, Math.max(120, nameOf(l.who).length * 24 + 30), 38, 19); c.fill();
    text(c, nameOf(l.who), tx + 10, y + 1, 22, { color: '#fff', align: 'left' });
  }
  const lines = wrap(c, l.text, x + w - 40 - tx, 30);
  lines.forEach((s, i) => text(c, s, tx, y + h / 2 + (i - (lines.length - 1) / 2) * 40, 30, { align: 'left' }));
  if (talkT > 0.25) { c.globalAlpha = 0.5 + Math.sin(G.T * 6) * 0.4; c.fillStyle = '#ff7aa8'; c.beginPath(); c.moveTo(x + w - 40, y + h - 30); c.lineTo(x + w - 24, y + h - 30); c.lineTo(x + w - 32, y + h - 18); c.fill(); }
  c.restore();
}
// スペースで くぎって ぎょうを わける
export function wrap(c, str, maxW, size) {
  c.font = `800 ${size}px ${FONT}`;
  const out = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (line && c.measureText(t).width > maxW) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

// ---------- よく つかう え ----------
export function panel(c, x, y, w, h, { fill = '#fffdf8', stroke = '#ffc2d4', r = 26 } = {}) {
  c.fillStyle = 'rgba(90,61,85,.15)'; rr(c, x, y + 6, w, h, r); c.fill();
  c.fillStyle = fill; rr(c, x, y, w, h, r); c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 4; rr(c, x, y, w, h, r); c.stroke(); }
}
export function stickerIcon(c, x, y, s) {
  c.save(); c.fillStyle = '#ffd84a'; c.strokeStyle = '#ffb21e'; c.lineWidth = s * 0.12;
  star(c, x, y, s, s * 0.5); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)'; circ(c, x - s * 0.2, y - s * 0.2, s * 0.15); c.fill();
  c.restore();
}
// うえの ひだり：いまの じかん。みぎ：シールと おと
export function hud(c, label, { stickers = true } = {}) {
  if (label) {
    c.font = `900 26px ${FONT}`;
    const w = c.measureText(label).width + 40;
    c.fillStyle = 'rgba(255,255,255,.92)'; rr(c, 14, 12, w, 46, 23); c.fill();
    text(c, label, 14 + w / 2, 36, 26);
  }
  if (stickers) {
    const s = String(G.save.stickers), w = 70 + s.length * 18;
    const x = V.W - 14 - 60 - 12 - w;
    c.fillStyle = 'rgba(255,255,255,.92)'; rr(c, x, 12, w, 46, 23); c.fill();
    stickerIcon(c, x + 28, 35, 15);
    text(c, s, x + 52, 36, 28, { align: 'left' });
  }
  button(c, { x: V.W - 14 - 60, y: 10, w: 60, h: 50 }, '', () => { G.save.sound = !G.save.sound; G.sound.setOn(G.save.sound); G.persist(); }, { icon: G.save.sound ? '🔊' : '🔈', size: 24, always: true });
}
// ぷにゅ（きがえ つき）
export function drawPunyu(c, x, y, r, st = {}) {
  drawCreature(c, 'punyu', x, y, r, { t: G.T, acc: G.save.outfit, ...st });
}
// きらきら・ハートの つぶ
export const fx = [];
export function burst(x, y, kind = 'star', n = 10, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 220;
    fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.9 + Math.random() * 0.4, t: 0, kind, color: color || ['#ffd84a', '#ff8fab', '#7fc7ff', '#b58cff'][i % 4], r: 8 + Math.random() * 8 });
  }
}
export function floatText(x, y, str, color = '#ff5d86', size = 34) { fx.push({ x, y, vx: 0, vy: -70, life: 1.1, t: 0, kind: 'text', str, color, r: size }); }
export function updateFx(dt) {
  for (const p of fx) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind !== 'text') p.vy += 420 * dt; }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > fx[i].life) fx.splice(i, 1);
}
export function drawFx(c) {
  for (const p of fx) {
    const a = 1 - p.t / p.life;
    c.save(); c.globalAlpha = Math.max(0, a);
    if (p.kind === 'text') text(c, p.str, p.x, p.y, p.r, { color: p.color, stroke: '#fff', sw: 7 });
    else if (p.kind === 'heart') { c.fillStyle = p.color; heartPath(c, p.x, p.y, p.r * 1.2); c.fill(); }
    else { c.fillStyle = p.color; star(c, p.x, p.y, p.r); c.fill(); }
    c.restore();
  }
}
// まんなかに おおきく でる もじ（「できた！」など）
let banner = null;
export function showBanner(str, sub = '', color = '#ff5d86') { banner = { str, sub, color, t: 0 }; }
export function drawBanner(c, dt) {
  if (!banner) return;
  banner.t += dt;
  if (banner.t > 1.8) { banner = null; return; }
  const k = banner.t < 0.25 ? ease(banner.t / 0.25) : banner.t > 1.5 ? 1 - (banner.t - 1.5) / 0.3 : 1;
  c.save(); c.globalAlpha = clamp(k, 0, 1);
  c.translate(V.W / 2, V.H * 0.38); c.scale(0.6 + k * 0.4, 0.6 + k * 0.4);
  text(c, banner.str, 0, 0, 72, { color: banner.color, stroke: '#fff', sw: 14 });
  if (banner.sub) text(c, banner.sub, 0, 64, 32, { stroke: '#fff', sw: 8 });
  c.restore();
}
// がめんの きりかえ（しろく ふわっと）
export const fade = { a: 0, dir: 0, then: null };
export function fadeTo(fn) { if (fade.dir) return; fade.dir = 1; fade.then = fn; }
export function updateFade(dt) {
  if (fade.dir === 1) { fade.a += dt * 3.2; if (fade.a >= 1) { fade.a = 1; fade.dir = -1; const f = fade.then; fade.then = null; f?.(); } }
  else if (fade.dir === -1) { fade.a -= dt * 2.6; if (fade.a <= 0) { fade.a = 0; fade.dir = 0; } }
}
export function drawFade(c) { if (fade.a > 0) { c.fillStyle = `rgba(255,248,252,${fade.a})`; c.fillRect(0, 0, V.W, V.H); } }

// たまご いろの ハッシュ（いつも おなじ でたらめ）
export const hash = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
