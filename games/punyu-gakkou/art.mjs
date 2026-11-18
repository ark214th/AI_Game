// けしき と もの の え（ずけいで かく）
import { drawWall, drawFloor, drawItem, depth, itemColor, drawSky, heartPath } from '../fushigi-pet-hotel/draw.mjs';
import { ROOM } from '../fushigi-pet-hotel/data.mjs';
import { itemDef } from './core.mjs';
import { rr, circ, ell, star, text, V, G, hash } from './ui.mjs';

export { drawSky };

// ---------- かいた え の キャッシュ ----------
const imgCache = new Map();
export function picImage(url) {
  if (!url) return null;
  let im = imgCache.get(url);
  if (!im) { im = new Image(); im.src = url; imgCache.set(url, im); }
  return im.complete && im.naturalWidth ? im : null;
}

// がくぶち つきの え
export function drawFramedPic(c, url, x, y, w, h, frame = '#e8a86a') {
  c.fillStyle = 'rgba(0,0,0,.12)'; rr(c, x - w / 2 + 4, y - h / 2 + 6, w, h, 8); c.fill();
  c.fillStyle = frame; rr(c, x - w / 2, y - h / 2, w, h, 8); c.fill();
  c.fillStyle = '#fff'; c.fillRect(x - w / 2 + 10, y - h / 2 + 10, w - 20, h - 20);
  const im = picImage(url);
  if (im) c.drawImage(im, x - w / 2 + 10, y - h / 2 + 10, w - 20, h - 20);
}

// ---------- ぷにゅの へや ----------
// rect の なかに へや（ざひょうは ROOM：よこ 1000）。opts.extras：[{ y, draw(c) }]（ぷにゅ や ともだち）
export function drawHomeRoom(c, room, rect, opts = {}) {
  const s = rect.w / ROOM.w;
  c.save();
  c.beginPath(); c.rect(rect.x, rect.y, rect.w, rect.h); c.clip();
  c.translate(rect.x, rect.y); c.scale(s, s);
  drawWall(c, room.wall);
  drawFloor(c, room.floor);
  const o = { t: G.T, night: opts.night };
  const draw1 = (cc, it) => {
    const d = itemDef(it.id);
    cc.save(); cc.translate(it.x, it.y);
    if (it === opts.lift) cc.translate(0, -12);
    if (d.zone !== 'wall') { const k = depth(it.y); cc.scale(k, k); }
    if (it.id === 'mypic') drawFramedPic(cc, G.save.pictures[it.ref], 0, 0, d.w, d.h);
    else if (it.id === 'mycraft') { drawCraftStand(cc, G.save.crafts[it.ref]); }
    else drawItem(cc, it.id, { ...o, color: itemColor(it) });
    if (it === opts.glow) { cc.strokeStyle = '#ffd84a'; cc.lineWidth = 6; cc.setLineDash([14, 10]); const b = d.zone === 'wall' ? [-d.w / 2, -d.h / 2, d.w, d.h] : d.flat ? [-d.w / 2, -d.h / 2, d.w, d.h] : [-d.w / 2, -d.h, d.w, d.h + 8]; rr(cc, b[0] - 8, b[1] - 8, b[2] + 16, b[3] + 16, 16); cc.stroke(); cc.setLineDash([]); }
    cc.restore();
  };
  const items = room.items;
  for (const it of items.filter(it => itemDef(it.id).zone === 'wall')) draw1(c, it);
  for (const it of items.filter(it => itemDef(it.id).flat)) draw1(c, it);
  const list = items.filter(it => itemDef(it.id).zone === 'floor' && !itemDef(it.id).flat).map(it => ({ y: it.y, draw: cc => draw1(cc, it) }));
  if (opts.extras) list.push(...opts.extras);
  list.sort((a, b) => a.y - b.y);
  for (const e of list) e.draw(c);
  if (opts.night) { c.fillStyle = `rgba(30,30,90,${0.4 * opts.night})`; c.fillRect(0, 0, ROOM.w, ROOM.h); }
  c.restore();
}

// ---------- こうさく ----------
// (x,y) は だいの あしもと。s は おおきさ
export function drawCraft(c, craft, x, y, s = 1, { t = 0 } = {}) {
  if (!craft) return;
  c.save(); c.translate(x, y); c.scale(s, s);
  // うしろに くる ぶひん
  for (const p of craft.parts) if (BACK_PARTS.has(p.type)) drawPart(c, p.type, p.x, p.y, p.color, t);
  drawBase(c, craft.base, craft.color);
  for (const p of craft.parts) if (!BACK_PARTS.has(p.type)) drawPart(c, p.type, p.x, p.y, p.color, t);
  c.restore();
}
// へやに かざる ときは だいの うえに のせる
function drawCraftStand(c, craft) {
  c.fillStyle = '#c98b55'; rr(c, -70, -18, 140, 18, 6); c.fill();
  c.fillStyle = '#a8703f'; c.fillRect(-60, 0, 12, 4); c.fillRect(48, 0, 12, 4);
  drawCraft(c, craft, 0, -18, 0.72);
}
const BACK_PARTS = new Set(['ears', 'horn', 'antenna', 'wings']);
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), cc = [n >> 16, (n >> 8) & 255, n & 255];
  return `rgb(${cc.map(v => Math.round(v * (1 - k))).join(',')})`;
};
export function drawBase(c, base, color) {
  c.fillStyle = 'rgba(0,0,0,.12)'; ell(c, 0, 0, 70, 12); c.fill();
  c.fillStyle = color; c.strokeStyle = shade(color, 0.22); c.lineWidth = 4;
  if (base === 'box') {
    rr(c, -62, -120, 124, 120, 10); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-62, -120, 124, 12);
    c.strokeStyle = 'rgba(0,0,0,.08)'; c.beginPath(); c.moveTo(-62, -60); c.lineTo(62, -60); c.stroke();
  } else if (base === 'cup') {
    c.beginPath(); c.moveTo(-58, 0); c.lineTo(-42, -140); c.lineTo(42, -140); c.lineTo(58, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = shade(color, 0.12); ell(c, 0, -140, 42, 9); c.fill();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(-50, -20); c.lineTo(-38, -130); c.lineTo(-28, -130); c.lineTo(-38, -20); c.fill();
  } else {
    circ(c, 0, -66, 64); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.4)'; ell(c, -22, -96, 20, 12, -0.5); c.fill();
  }
}
export function drawPart(c, type, x, y, color = '#ff5d86', t = 0) {
  c.save(); c.translate(x, y);
  const ink = '#3a2a3a';
  c.lineCap = 'round'; c.lineJoin = 'round';
  switch (type) {
    case 'eyes':
      for (const s of [-1, 1]) { c.fillStyle = '#fff'; circ(c, s * 20, 0, 15); c.fill(); c.strokeStyle = ink; c.lineWidth = 3; c.stroke(); c.fillStyle = ink; circ(c, s * 20 + 3, 2, 7); c.fill(); c.fillStyle = '#fff'; circ(c, s * 20 + 5, -1, 2.5); c.fill(); }
      break;
    case 'mouth':
      c.fillStyle = ink; c.beginPath(); c.moveTo(-16, -4); c.quadraticCurveTo(0, 22, 16, -4); c.closePath(); c.fill();
      c.fillStyle = '#ff8fab'; ell(c, 0, 6, 7, 4); c.fill();
      break;
    case 'ears':
      c.fillStyle = color;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 18, 10); c.lineTo(s * 40, -34); c.lineTo(s * 52, 8); c.closePath(); c.fill(); c.fillStyle = '#ffd6e2'; c.beginPath(); c.moveTo(s * 26, 6); c.lineTo(s * 40, -20); c.lineTo(s * 46, 6); c.closePath(); c.fill(); c.fillStyle = color; }
      break;
    case 'horn':
      c.fillStyle = '#ffe9a8'; c.strokeStyle = '#e8c35a'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-12, 10); c.lineTo(0, -40); c.lineTo(12, 10); c.closePath(); c.fill(); c.stroke();
      break;
    case 'star':
      c.fillStyle = color === '#ffffff' ? '#ffd84a' : color; c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 3;
      star(c, 0, 0, 22, 10, 5, -Math.PI / 2 + Math.sin(t * 2 + x) * 0.15); c.fill(); c.stroke();
      break;
    case 'heart':
      c.fillStyle = color; heartPath(c, 0, -4, 34); c.fill();
      break;
    case 'flower':
      c.fillStyle = color; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circ(c, Math.cos(a) * 12, Math.sin(a) * 12, 10); c.fill(); }
      c.fillStyle = '#ffd84a'; circ(c, 0, 0, 8); c.fill();
      break;
    case 'ribbon':
      c.fillStyle = color;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-28, -24, -30, 2); c.quadraticCurveTo(-28, 20, 0, 0); c.fill();
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(28, -24, 30, 2); c.quadraticCurveTo(28, 20, 0, 0); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; circ(c, 0, 0, 7); c.fill();
      break;
    case 'wheels':
      for (const s of [-1, 1]) { c.fillStyle = '#4a4a5a'; circ(c, s * 42, 0, 20); c.fill(); c.fillStyle = '#c9cfdc'; circ(c, s * 42, 0, 9); c.fill(); }
      break;
    case 'window':
      c.fillStyle = '#bfe8ff'; c.strokeStyle = '#fff'; c.lineWidth = 5; rr(c, -22, -22, 44, 44, 6); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0, -22); c.lineTo(0, 22); c.moveTo(-22, 0); c.lineTo(22, 0); c.stroke();
      break;
    case 'antenna':
      c.strokeStyle = '#8a8fa3'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -32); c.stroke();
      c.fillStyle = color; circ(c, 0, -36, 10 + Math.sin(t * 4) * 1.5); c.fill();
      break;
    case 'wings':
      c.fillStyle = 'rgba(255,255,255,.95)'; c.strokeStyle = '#bcd7ff'; c.lineWidth = 3;
      for (const s of [-1, 1]) { const f = Math.sin(t * 6) * 0.15; c.save(); c.scale(s, 1); c.rotate(f); c.beginPath(); c.moveTo(20, 0); c.quadraticCurveTo(70, -50, 86, -10); c.quadraticCurveTo(70, 10, 20, 12); c.closePath(); c.fill(); c.stroke(); c.restore(); }
      break;
  }
  c.restore();
}

// ---------- がっこう ----------
export const classFloor = () => V.H * 0.5;
// きょうしつ。board：こくばんの もじ
export function drawClassroom(c, board = '', { t = 0, evening = 0, pics = null } = {}) {
  const W = V.W, H = V.H, fy = classFloor();
  c.fillStyle = '#f6efd9'; c.fillRect(0, 0, W, fy);
  c.fillStyle = '#e8dcbc'; c.fillRect(0, fy - 70, W, 70);
  c.fillStyle = '#c99a6a'; c.fillRect(0, fy - 74, W, 6);
  // ゆか
  const g = c.createLinearGradient(0, fy, 0, H);
  g.addColorStop(0, '#d9a978'); g.addColorStop(1, '#c58f5c');
  c.fillStyle = g; c.fillRect(0, fy, W, H - fy);
  c.strokeStyle = 'rgba(120,70,30,.18)'; c.lineWidth = 2;
  for (let y = fy + 18; y < H; y += 26) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  // まど（ひだり）
  for (let i = 0; i < 2; i++) {
    const x = 26 + i * 120;
    if (x + 100 > W * 0.25) break;
    c.fillStyle = '#fff'; rr(c, x, 60, 100, 170, 6); c.fill();
    const sky = c.createLinearGradient(0, 66, 0, 224);
    sky.addColorStop(0, evening ? '#ffb88a' : '#8fd4ff'); sky.addColorStop(1, evening ? '#ffe0a8' : '#d8f2ff');
    c.fillStyle = sky; c.fillRect(x + 6, 66, 88, 158);
    c.fillStyle = 'rgba(255,255,255,.85)'; circ(c, x + 30 + Math.sin(t * 0.2 + i) * 6, 110, 14); c.fill(); circ(c, x + 48 + Math.sin(t * 0.2 + i) * 6, 114, 11); c.fill();
    c.fillStyle = '#fff'; c.fillRect(x + 47, 66, 6, 158); c.fillRect(x + 6, 142, 88, 6);
  }
  // こくばん
  const bw = Math.min(520, W * 0.5), bx = W / 2 - bw / 2 + 30, by = 54, bh = 170;
  c.fillStyle = '#b07a48'; rr(c, bx - 12, by - 12, bw + 24, bh + 30, 10); c.fill();
  c.fillStyle = '#2f6b52'; rr(c, bx, by, bw, bh, 6); c.fill();
  c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(bx + 20, by + 14, bw * 0.4, 8);
  c.fillStyle = '#fff'; c.fillRect(bx + bw - 70, by + bh + 4, 26, 8); c.fillStyle = '#ffd84a'; c.fillRect(bx + bw - 38, by + bh + 4, 22, 8);
  if (board) {
    const lines = board.split('\n');
    lines.forEach((l, i) => text(c, l, bx + bw / 2, by + bh / 2 + (i - (lines.length - 1) / 2) * 50, 44, { color: '#fffef0' }));
  }
  // とけい
  const cx = W - 70, cy = 130;
  c.fillStyle = '#fff'; c.strokeStyle = '#ff9fbd'; c.lineWidth = 6; circ(c, cx, cy, 38); c.fill(); c.stroke();
  c.strokeStyle = '#3a2a3a'; c.lineWidth = 4; c.lineCap = 'round';
  const hr = G.day?.clock ?? 8.5;
  const ah = (hr % 12) / 12 * Math.PI * 2 - Math.PI / 2, am = (hr % 1) * Math.PI * 2 - Math.PI / 2;
  c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ah) * 20, cy + Math.sin(ah) * 20); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(am) * 30, cy + Math.sin(am) * 30); c.stroke();
  // うしろの けいじ（みんなの え）
  if (pics) pics(c, { y: fy - 140 });
}
// たてものの とけい（ちいさな めもりと はり）
function clockFace(c, x, y, r) {
  c.strokeStyle = '#3a2a3a'; c.lineCap = 'round';
  c.fillStyle = '#c9b8d6'; for (let i = 0; i < 12; i += 3) { const a = i / 12 * Math.PI * 2; circ(c, x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78, r * 0.08); c.fill(); }
  c.lineWidth = r * 0.12; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - r * 0.6); c.stroke();
  c.lineWidth = r * 0.14; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r * 0.4, y + r * 0.1); c.stroke();
}
export function drawDesk(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#8a8fa3'; c.fillRect(-46, -6, 6, 40); c.fillRect(40, -6, 6, 40);
  c.fillStyle = '#e3b27e'; rr(c, -58, -20, 116, 18, 5); c.fill();
  c.fillStyle = '#c99a6a'; c.fillRect(-58, -6, 116, 6);
  c.restore();
}
// こうてい
export function drawSchoolyard(c, t = 0) {
  const W = V.W, H = V.H, gy = H * 0.52;
  drawSky(c, W, gy + 40, 0, t);
  // こうしゃ
  const bx = W * 0.08, bw = W * 0.55;
  c.fillStyle = '#fff4e6'; c.fillRect(bx, gy - 210, bw, 210);
  c.fillStyle = '#ff9fbd'; c.fillRect(bx - 10, gy - 222, bw + 20, 16);
  for (let r = 0; r < 2; r++) for (let i = 0; i < Math.floor(bw / 70); i++) { c.fillStyle = '#bfe8ff'; rr(c, bx + 20 + i * 70, gy - 190 + r * 90, 46, 56, 4); c.fill(); }
  c.fillStyle = '#fff'; circ(c, bx + bw / 2, gy - 250, 28); c.fill(); c.fillStyle = '#ff9fbd'; c.fillRect(bx + bw / 2 - 30, gy - 236, 60, 14);
  clockFace(c, bx + bw / 2, gy - 250, 22);
  // き
  for (const [x, h] of [[W * 0.74, 150], [W * 0.92, 120]]) {
    c.fillStyle = '#a8703f'; c.fillRect(x - 10, gy - h * 0.5, 20, h * 0.5 + 10);
    c.fillStyle = '#6cbf57'; circ(c, x, gy - h * 0.7, h * 0.4); c.fill(); circ(c, x - h * 0.28, gy - h * 0.5, h * 0.28); c.fill(); circ(c, x + h * 0.28, gy - h * 0.5, h * 0.28); c.fill();
  }
  // すな の ちめん
  c.fillStyle = '#f3d9a4'; c.fillRect(0, gy, W, H - gy);
  c.fillStyle = '#ecd096'; for (let i = 0; i < 24; i++) { ell(c, hash(i) * W, gy + 20 + hash(i + 40) * (H - gy), 30, 6); c.fill(); }
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; ell(c, W / 2, gy + (H - gy) * 0.55, W * 0.38, (H - gy) * 0.3); c.stroke();
}
// たいいくかん
export function drawGym(c, t = 0) {
  const W = V.W, H = V.H, fy = H * 0.5;
  c.fillStyle = '#fbe9d0'; c.fillRect(0, 0, W, fy);
  // ぶたい と まく
  c.fillStyle = '#ff6f91'; c.fillRect(0, 0, W, 34);
  for (let x = 0; x < W; x += 40) { c.fillStyle = x / 40 % 2 ? '#ff8fab' : '#ff6f91'; c.beginPath(); c.moveTo(x, 34); c.quadraticCurveTo(x + 20, 54, x + 40, 34); c.fill(); }
  // まど
  for (let i = 0; i < 6; i++) { const x = W * (0.08 + i * 0.16); c.fillStyle = '#d8f2ff'; rr(c, x, 70, W * 0.1, 60, 6); c.fill(); }
  // ライト
  for (let i = 0; i < 4; i++) {
    const x = W * (0.2 + i * 0.2), a = 0.1 + Math.max(0, Math.sin(t * 2 + i)) * 0.08;
    c.fillStyle = `rgba(255,240,180,${a})`; c.beginPath(); c.moveTo(x - 20, 40); c.lineTo(x + 20, 40); c.lineTo(x + 110, fy); c.lineTo(x - 110, fy); c.fill();
  }
  // ゆか
  c.fillStyle = '#e8b878'; c.fillRect(0, fy, W, H - fy);
  c.strokeStyle = 'rgba(150,90,40,.2)'; c.lineWidth = 2;
  for (let x = -H; x < W; x += 60) { c.beginPath(); c.moveTo(x, fy); c.lineTo(x + (H - fy) * 0.4, H); c.stroke(); }
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, fy + 30); c.lineTo(W, fy + 30); c.stroke();
}
// みち（まち の なか）。scroll：すすんだ きょり。to：'school' / 'home'
export function drawStreet(c, scroll, { evening = 0, t = 0, end = null, endX = 0 } = {}) {
  const W = V.W, H = V.H, gy = H * 0.66;
  const sky = c.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, evening ? '#ff9f8a' : '#7fd0ff'); sky.addColorStop(1, evening ? '#ffe3a8' : '#d6f2ff');
  c.fillStyle = sky; c.fillRect(0, 0, W, gy);
  if (evening) { c.fillStyle = '#ffd36b'; circ(c, W * 0.8, gy * 0.45, 46); c.fill(); }
  // とおくの やま
  c.fillStyle = evening ? '#e9a38f' : '#b5e3a0';
  for (let i = -1; i < 6; i++) { const x = i * 300 - (scroll * 0.2) % 300; c.beginPath(); c.moveTo(x, gy - 40); c.quadraticCurveTo(x + 150, gy - 200, x + 300, gy - 40); c.fill(); }
  // いえ と き
  for (let i = -1; i < Math.ceil(W / 220) + 2; i++) {
    const k = Math.floor((scroll * 0.6) / 220) + i, x = k * 220 - scroll * 0.6;
    if (hash(k) < 0.55) {
      const col = ['#ffd6e2', '#d6ecff', '#fff1c9', '#e2f7d2'][Math.floor(hash(k + 9) * 4)];
      const roof = ['#ff8fab', '#7fb8ff', '#ffb347', '#8fd36a'][Math.floor(hash(k + 3) * 4)];
      c.fillStyle = col; c.fillRect(x + 30, gy - 130, 140, 110);
      c.fillStyle = roof; c.beginPath(); c.moveTo(x + 18, gy - 128); c.lineTo(x + 100, gy - 190); c.lineTo(x + 182, gy - 128); c.fill();
      c.fillStyle = evening ? '#ffe9a0' : '#bfe8ff'; rr(c, x + 50, gy - 105, 36, 30, 4); c.fill(); rr(c, x + 115, gy - 105, 36, 30, 4); c.fill();
    } else {
      c.fillStyle = '#a8703f'; c.fillRect(x + 92, gy - 80, 16, 70);
      c.fillStyle = evening ? '#7fae63' : '#6cbf57'; circ(c, x + 100, gy - 110, 50); c.fill(); circ(c, x + 70, gy - 80, 34); c.fill(); circ(c, x + 130, gy - 80, 34); c.fill();
    }
  }
  // さく
  c.fillStyle = '#fff'; for (let x = -((scroll) % 40); x < W; x += 40) c.fillRect(x, gy - 34, 8, 34);
  c.fillRect(0, gy - 28, W, 6);
  // ゴール の たてもの
  if (end) end(c, endX, gy);
  // みち
  c.fillStyle = evening ? '#d9c3a6' : '#e9d8bd'; c.fillRect(0, gy, W, H - gy);
  c.fillStyle = evening ? '#b0a08e' : '#bdb3a6'; c.fillRect(0, gy + (H - gy) * 0.5, W, (H - gy) * 0.5);
  c.fillStyle = '#fff'; for (let x = -((scroll) % 120); x < W; x += 120) c.fillRect(x, gy + (H - gy) * 0.72, 60, 8);
  // はな
  for (let i = 0; i < 12; i++) { const x = ((hash(i + 70) * 1600 - scroll) % 1600 + 1600) % 1600 - 100; c.fillStyle = ['#ff8fab', '#ffd84a', '#fff'][i % 3]; circ(c, x, gy + 14 + hash(i) * 30, 6); c.fill(); }
}
export function drawSchoolGate(c, x, gy) {
  c.fillStyle = '#fff4e6'; c.fillRect(x, gy - 260, 420, 240);
  c.fillStyle = '#ff9fbd'; c.fillRect(x - 10, gy - 272, 440, 18);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) { c.fillStyle = '#bfe8ff'; rr(c, x + 24 + i * 78, gy - 236 + r * 92, 50, 58, 4); c.fill(); }
  c.fillStyle = '#fff'; circ(c, x + 210, gy - 300, 30); c.fill(); c.fillStyle = '#ff9fbd'; c.fillRect(x + 178, gy - 286, 64, 16);
  clockFace(c, x + 210, gy - 300, 24);
  c.fillStyle = '#9aa0b5'; c.fillRect(x - 60, gy - 90, 20, 90); c.fillRect(x - 160, gy - 90, 20, 90);
  c.fillStyle = '#fff'; rr(c, x - 170, gy - 130, 140, 44, 8); c.fill();
  text(c, 'ぷにゅ がっこう', x - 100, gy - 108, 20);
}
export function drawPunyuHouse(c, x, gy, evening = 0) {
  c.fillStyle = '#ffe3ec'; c.fillRect(x, gy - 200, 260, 190);
  c.fillStyle = '#ff6f91'; c.beginPath(); c.moveTo(x - 24, gy - 196); c.lineTo(x + 130, gy - 300); c.lineTo(x + 284, gy - 196); c.fill();
  c.fillStyle = '#c98b55'; rr(c, x + 100, gy - 120, 60, 110, 8); c.fill();
  c.fillStyle = '#ffd84a'; circ(c, x + 148, gy - 62, 5); c.fill();
  c.fillStyle = evening ? '#ffe9a0' : '#bfe8ff'; rr(c, x + 24, gy - 160, 56, 46, 6); c.fill(); rr(c, x + 180, gy - 160, 56, 46, 6); c.fill();
  c.fillStyle = '#fff'; circ(c, x + 130, gy - 240, 22); c.fill();
  c.fillStyle = '#ff9fbd'; c.save(); c.translate(x + 130, gy - 240); c.scale(0.9, 0.9); heartPath(c, 0, -2, 26); c.fill(); c.restore();
}

// ---------- クラスメートの え（けいじ よう） ----------
export function drawKidArt(c, sp, x, y, w, h) {
  c.save();
  c.fillStyle = '#fff'; c.fillRect(x, y, w, h);
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.translate(x, y); c.scale(w / 100, h / 75);
  c.lineCap = 'round'; c.lineJoin = 'round';
  switch (sp) {
    case 'fuwari': // にじ と くも
      ['#ff5d6c', '#ffb347', '#ffd84a', '#6cbf57', '#4fa8ff'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.arc(50, 70, 44 - i * 6, Math.PI, 0); c.stroke(); });
      c.fillStyle = '#eef'; circ(c, 18, 62, 10); c.fill(); circ(c, 82, 62, 10); c.fill();
      break;
    case 'gorota': // やま
      c.fillStyle = '#8fd36a'; c.beginPath(); c.moveTo(0, 75); c.lineTo(35, 25); c.lineTo(70, 75); c.fill();
      c.fillStyle = '#6cbf57'; c.beginPath(); c.moveTo(40, 75); c.lineTo(72, 35); c.lineTo(100, 75); c.fill();
      c.fillStyle = '#ffd84a'; circ(c, 84, 16, 9); c.fill();
      break;
    case 'pokari': // おひさま
      c.fillStyle = '#ff9f43'; circ(c, 50, 38, 18); c.fill();
      c.strokeStyle = '#ff5d6c'; c.lineWidth = 4; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.beginPath(); c.moveTo(50 + Math.cos(a) * 24, 38 + Math.sin(a) * 24); c.lineTo(50 + Math.cos(a) * 33, 38 + Math.sin(a) * 33); c.stroke(); }
      break;
    case 'chapu': // うみ と さかな
      c.fillStyle = '#9fd8ff'; c.fillRect(0, 38, 100, 40);
      c.fillStyle = '#ff9f43'; ell(c, 45, 55, 14, 8); c.fill(); c.beginPath(); c.moveTo(58, 55); c.lineTo(68, 47); c.lineTo(68, 63); c.fill();
      c.strokeStyle = '#4fa8ff'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i < 5; i++) c.arc(10 + i * 20, 38, 10, Math.PI, 0); c.stroke();
      break;
    case 'popuri': // おはな
      [[25, '#ff8fc8'], [50, '#ffd84a'], [75, '#ff5d6c']].forEach(([fx, col]) => {
        c.strokeStyle = '#6cbf57'; c.lineWidth = 3; c.beginPath(); c.moveTo(fx, 40); c.lineTo(fx, 72); c.stroke();
        c.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circ(c, fx + Math.cos(a) * 7, 34 + Math.sin(a) * 7, 6); c.fill(); }
        c.fillStyle = '#fff'; circ(c, fx, 34, 4); c.fill();
      });
      break;
    case 'kirara': // よぞら と ほし
      c.fillStyle = '#3d4687'; c.fillRect(0, 0, 100, 75);
      c.fillStyle = '#ffd84a'; [[20, 20, 8], [55, 35, 12], [82, 18, 6], [30, 55, 6], [78, 58, 8]].forEach(([sx, sy, r]) => { star(c, sx, sy, r); c.fill(); });
      break;
  }
  c.restore();
  c.strokeStyle = '#e8a86a'; c.lineWidth = 4; c.strokeRect(x, y, w, h);
}
