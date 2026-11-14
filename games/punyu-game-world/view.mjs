// がめんを かく：3しゅるいの あそび と、タイトル・ひろば・けっか
import { W, H, WORLDS, FINAL } from './data.mjs';
import { TS, RH, DM, rhythmRatio, finalUnlocked } from './core.mjs';
import * as D from './draw.mjs';
import { worldBg } from './cutscene.mjs';

export const ACT_BTN = { x: 858, y: 428, r: 70 };
export const LANE_X = [200, 480, 760], HIT_Y = 430;
export const PAUSE_BTN = { x: W - 62, y: 6, w: 54, h: 40 };
export const BACK_BTN = { x: 14, y: 12, w: 130, h: 46 };
export const SKIP_BTN = { x: W - 158, y: 12, w: 144, h: 46 };
export const HUB_CARDS = [...WORLDS, FINAL].map((w, i) => ({ world: w, x: 28 + i * 230, y: 150, w: 214, h: 250 }));
export const HUB_BTNS = { story: { x: 560, y: 462, w: 180, h: 54 }, sound: { x: 756, y: 462, w: 180, h: 54 } };
export const PAUSE_ITEMS = ['つづける', 'さいしょから', 'ゲームきに もどる', 'おと'].map((label, i) => ({ label, x: W / 2 - 180, y: 150 + i * 76, w: 360, h: 62 }));
export const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

const LANE_COL = ['#ff7fc4', '#ffd84a', '#5fe3ff'];
const BULLET_COL = { pink: '#ff7fc4', cyan: '#5fe3ff', gold: '#ffd84a', violet: '#b98bff', green: '#6ff09a', white: '#ffffff' };

export function button(c, r, label, o = {}) {
  c.fillStyle = 'rgba(0,0,0,.25)'; D.rr(c, r.x + 2, r.y + 5, r.w, r.h, r.h / 2); c.fill();
  c.fillStyle = o.bg || '#fff'; D.rr(c, r.x, r.y, r.w, r.h, r.h / 2); c.fill();
  D.text(c, label, r.x + r.w / 2, r.y + r.h / 2 + 1, o.size || 22, o.fg || '#5a3fd0');
}
function hud(c, s, hint) {
  c.fillStyle = 'rgba(15,10,40,.55)'; c.fillRect(0, 0, W, 52);
  c.fillStyle = D.COL.gold; D.star(c, 30, 26, 15); c.fill();
  D.text(c, String(s.stars), 54, 27, 26, '#fff', { align: 'left' });
  if (hint) D.text(c, hint, W / 2, 27, 21, '#fff');
  c.fillStyle = 'rgba(255,255,255,.9)'; D.rr(c, PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h, 12); c.fill();
  c.fillStyle = '#5a3fd0'; c.fillRect(PAUSE_BTN.x + 17, PAUSE_BTN.y + 10, 7, 20); c.fillRect(PAUSE_BTN.x + 30, PAUSE_BTN.y + 10, 7, 20);
}

export function drawFx(c, fx) {
  for (const p of fx) {
    const k = Math.max(0, p.life / p.max);
    c.globalAlpha = Math.min(1, k * 2);
    if (p.kind === 'text') D.text(c, p.text, p.x, p.y, p.size || 30, p.c || '#fff', { stroke: p.stroke || '#5a2d8a' });
    else if (p.kind === 'ring') { c.strokeStyle = p.c || '#fff'; c.lineWidth = 6 * k; c.beginPath(); c.arc(p.x, p.y, (p.size || 60) * (1 - k * 0.8), 0, D.TAU); c.stroke(); }
    else if (p.kind === 'star') { c.fillStyle = p.c || D.COL.gold; D.star(c, p.x, p.y, (p.size || 9) * (0.4 + k), p.life * 6); c.fill(); }
    else { c.fillStyle = p.c || '#fff'; c.beginPath(); c.arc(p.x, p.y, (p.size || 5) * k, 0, D.TAU); c.fill(); }
  }
  c.globalAlpha = 1;
}

// ===================== 弾幕 =====================
export function drawDanmaku(c, s, ui) {
  const t = ui.t, bugWorld = ui.world.id === 'bug';
  if (bugWorld) D.bgGlitch(c, t); else D.bgSky(c, t);
  const b = s.boss;
  if (b) {
    // まほうじん
    c.save(); c.translate(b.x, b.y); c.rotate(t * 0.6); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, 78 + Math.sin(t * 4) * 4, 0, D.TAU); c.stroke(); D.star(c, 0, 0, 78, 0, 6, 0.58); c.stroke(); c.restore();
    D.drawBossByKind(c, b.kind, b.x, b.y + Math.sin(t * 3) * 5, b.r, { t, mood: b.kind === 'luna' ? 'bugged' : 'grin' });
    const k = Math.max(0, b.hp / b.maxHp);
    c.fillStyle = 'rgba(0,0,0,.4)'; D.rr(c, 200, 60, 560, 12, 6); c.fill(); c.fillStyle = '#ff7fc4'; D.rr(c, 200, 60, Math.max(12, 560 * k), 12, 6); c.fill();
  }
  for (const e of s.enemies) D.drawStarKid(c, e.x, e.y, e.r, t + e.t);
  c.fillStyle = 'rgba(255,240,150,.9)'; for (const sh of s.shots) { D.star(c, sh.x, sh.y, 9, t * 8); c.fill(); }
  for (const it of s.items) { c.fillStyle = D.COL.gold; D.star(c, it.x, it.y, 10, t * 3); c.fill(); }
  for (const u of s.bullets) {
    const col = BULLET_COL[u.c] || '#fff', r = u.r;
    c.fillStyle = col; c.globalAlpha = 0.3; c.beginPath(); c.arc(u.x, u.y, r + 7, 0, D.TAU); c.fill(); c.globalAlpha = 1;
    if (u.shape === 'star') { D.star(c, u.x, u.y, r + 5, u.t * 3); c.fill(); c.fillStyle = '#fff'; D.star(c, u.x, u.y, r * 0.6, u.t * 3); c.fill(); }
    else if (u.shape === 'square') { c.save(); c.translate(u.x, u.y); c.rotate(u.t * 3); c.fillRect(-r - 2, -r - 2, r * 2 + 4, r * 2 + 4); c.fillStyle = '#fff'; c.fillRect(-r * 0.5, -r * 0.5, r, r); c.restore(); }
    else if (u.shape === 'rice') { c.beginPath(); c.ellipse(u.x, u.y, r, r + 8, 0, 0, D.TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(u.x, u.y, r * 0.45, r, 0, 0, D.TAU); c.fill(); }
    else { c.beginPath(); c.arc(u.x, u.y, r + 3, 0, D.TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(u.x, u.y, r * 0.55, 0, D.TAU); c.fill(); }
  }
  // ぷにゅ（あたりはんていは まんなかの ひかる てん だけ）
  if (!(s.inv > 0 && Math.floor(t * 12) % 2)) D.drawPunyu(c, s.px, s.py + 4, 27, { t, costume: 'star', mouth: s.inv > 0.8 ? 'o' : 'smile', squash: s.inv > 1.2 ? 0.2 : 0 });
  c.fillStyle = 'rgba(255,127,196,.55)'; c.beginPath(); c.arc(s.px, s.py, DM.PR + 5 + Math.sin(t * 8), 0, D.TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(s.px, s.py, DM.PR - 1, 0, D.TAU); c.fill();
  drawFx(c, ui.fx);
  hud(c, s);
  const sp = ui.spell;
  if (sp) {
    const k = Math.min(1, sp.t / 0.35), out = sp.t > 2.2 ? Math.min(1, (sp.t - 2.2) / 0.3) : 0;
    if (out < 1) {
      c.save(); c.globalAlpha = 1 - out; c.translate((1 - k) * 600, 0);
      const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(90,63,208,0)'); g.addColorStop(0.3, 'rgba(90,63,208,.9)'); g.addColorStop(1, 'rgba(255,127,196,.9)');
      c.fillStyle = g; c.fillRect(0, 200, W, 96);
      D.drawBossByKind(c, sp.boss, 760, 236, 50, { t, mood: 'grin' });
      D.text(c, 'ひっさつ ダンス', 300, 224, 20, '#ffe9a8'); D.text(c, sp.name, 300, 262, 38, '#fff', { stroke: '#3b2aa8' });
      c.restore();
    }
    D.text(c, sp.name, 480, 90, 20, '#ffe9a8', { stroke: 'rgba(0,0,0,.5)' });
  }
}

// ===================== 冒険（ひくい かいぞうどで かいて ドットえ ふうに）=====================
let pix = null;
function pixCanvas() {
  if (!pix) { pix = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W / 3, H / 3) : Object.assign(document.createElement('canvas'), { width: W / 3, height: H / 3 }); }
  const p = pix.getContext('2d'); p.setTransform(1 / 3, 0, 0, 1 / 3, 0, 0); return p;
}
export function pixelate(c, drawFn) {
  const p = pixCanvas(); p.clearRect(0, 0, W, H); drawFn(p);
  const sm = c.imageSmoothingEnabled; c.imageSmoothingEnabled = false; c.drawImage(pix, 0, 0, W, H); c.imageSmoothingEnabled = sm;
}
const THEME = {
  field: { f1: '#86d063', f2: '#7bc65a', wall: '#2f7a3a', wall2: '#3f9a4a', trunk: '#6b4526' },
  cave: { f1: '#77697f', f2: '#6e6176', wall: '#3a3148', wall2: '#4c4260' },
  castle: { f1: '#9a94b8', f2: '#8f89ad', wall: '#4a4468', wall2: '#5f5884' },
  glitch: { f1: '#2d1457', f2: '#24306b', wall: '#120726', wall2: '#58f0a0' },
};
function drawTiles(p, s, t) {
  const th = THEME[s.def.theme] || THEME.field;
  for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) {
    const ch = s.grid[y][x], X = x * TS, Y = y * TS;
    p.fillStyle = (x + y) % 2 ? th.f1 : th.f2; p.fillRect(X, Y, TS, TS);
    if (ch === '#') {
      if (s.def.theme === 'field') { p.fillStyle = th.trunk; p.fillRect(X + 24, Y + 36, 12, 24); p.fillStyle = th.wall; p.beginPath(); p.arc(X + 30, Y + 26, 28, 0, D.TAU); p.fill(); p.fillStyle = th.wall2; p.beginPath(); p.arc(X + 22, Y + 18, 12, 0, D.TAU); p.fill(); }
      else { p.fillStyle = th.wall; p.fillRect(X, Y, TS, TS); p.fillStyle = th.wall2; p.fillRect(X + 3, Y + 3, TS - 6, 9); if (s.def.theme !== 'glitch') { p.fillRect(X + 3, Y + 30, 24, 6); p.fillRect(X + 33, Y + 45, 24, 6); } }
    } else if (ch === 'g' || ch === 'k') {
      p.fillStyle = '#2f9a45'; p.beginPath(); p.arc(X + 30, Y + 34, 24, 0, D.TAU); p.fill();
      p.fillStyle = '#5fd06a'; p.beginPath(); p.arc(X + 20, Y + 24, 12, 0, D.TAU); p.arc(X + 40, Y + 26, 11, 0, D.TAU); p.arc(X + 30, Y + 14, 10, 0, D.TAU); p.fill();
    } else if (ch === '=' || ch === 's') {
      p.fillStyle = 'rgba(0,0,0,.22)'; p.fillRect(X, Y + 15, TS, 6); p.fillRect(X, Y + 39, TS, 6);
      if (ch === 's') { const on = s.blocks.some(b => b.x === x && b.y === y); p.fillStyle = '#2a2238'; p.fillRect(X + 9, Y + 9, 42, 42); p.fillStyle = on ? '#6ff09a' : '#ff5f7f'; p.fillRect(X + 15, Y + 15, 30, 30); }
    } else if (ch === 'D') {
      if (s.doorOpen) { p.fillStyle = 'rgba(0,0,0,.3)'; p.fillRect(X, Y, TS, 6); p.fillRect(X, Y + 54, TS, 6); }
      else { p.fillStyle = '#8a5a2b'; p.fillRect(X + 3, Y, TS - 6, TS); p.fillStyle = '#6b4320'; p.fillRect(X + 27, Y, 6, TS); p.fillStyle = D.COL.gold; p.fillRect(X + 21, Y + 21, 18, 18); p.fillStyle = '#3a2a10'; p.fillRect(X + 27, Y + 27, 6, 9); }
    } else if (ch === 'C') {
      const open = s.chest === 'open';
      p.fillStyle = '#8a5a2b'; p.fillRect(X + 6, Y + 24, 48, 30); p.fillStyle = D.COL.gold; p.fillRect(X + 6, Y + 33, 48, 6); p.fillRect(X + 24, Y + 30, 12, 15);
      p.fillStyle = '#a66e35'; if (open) p.fillRect(X + 6, Y + 3, 48, 12); else p.fillRect(X + 6, Y + 12, 48, 15);
      if (!open && Math.sin(t * 5) > 0.6) { p.fillStyle = '#fff'; D.star(p, X + 48, Y + 12, 8, t); p.fill(); }
    }
  }
}
export function drawAdventure(c, s, ui) {
  const t = ui.t;
  pixelate(c, p => {
    drawTiles(p, s, t);
    for (const b of s.blocks) { const X = b.x * TS + b.ox, Y = b.y * TS + b.oy; p.fillStyle = '#8f88a6'; p.fillRect(X + 3, Y + 3, 54, 54); p.fillStyle = '#c4bed8'; p.fillRect(X + 6, Y + 6, 48, 42); p.fillStyle = '#5a5470'; p.fillRect(X + 18, Y + 21, 6, 9); p.fillRect(X + 36, Y + 21, 6, 9); }
    for (const e of s.enemies) D.drawSlime(p, e.x, e.y, 21, { t: t + e.x });
    const b = s.boss;
    if (b && b.hp > 0) {
      p.fillStyle = 'rgba(0,0,0,.28)'; p.beginPath(); p.ellipse(b.px, b.py + b.r * 0.7, b.r * (1 - b.z / 260), b.r * 0.3, 0, 0, D.TAU); p.fill();
      const flashOn = b.hitCool > 0.25, dizzy = b.state === 'dizzy';
      if (!flashOn) D.drawBossByKind(p, b.kind, b.px, b.py - b.z, b.r, { t, dizzy, mood: dizzy ? 'dizzy' : 'grin', squash: b.state === 'wait' && b.st > 0.35 ? 0.2 : dizzy ? Math.sin(t * 8) * 0.06 : 0 });
      if (dizzy) for (let i = 0; i < 3; i++) { p.fillStyle = D.COL.gold; D.star(p, b.px + Math.cos(t * 5 + i * 2.1) * b.r * 0.8, b.py - b.r * 1.2 + Math.sin(t * 5 + i * 2.1) * 9, 9, t * 4); p.fill(); }
    }
    const hold = s.chest === 'open';
    if (!(s.inv > 0 && Math.floor(t * 12) % 2)) {
      const sw = s.swing > 0 ? 1 - s.swing / 0.22 : 0;
      D.drawPunyu(p, s.px, s.py - 6 - (s.moving ? Math.abs(Math.sin(t * 12)) * 4 : 0), 25, { t, costume: 'hero', dir: s.dir[0], swing: sw, hold, eyes: hold ? 'happy' : 'open', mouth: hold ? 'open' : 'smile' });
      if (s.swing > 0) { p.strokeStyle = '#fff'; p.lineWidth = 8; p.beginPath(); const a = Math.atan2(s.dir[1], s.dir[0]); p.arc(s.px, s.py, 46, a - 1 + sw * 0.6, a + 0.2 + sw * 0.8); p.stroke(); }
    }
    if (hold) { const k = Math.min(1, (3.2 - s.doneT) / 0.6); D.drawItem(p, s.def.item, s.px, s.py - 40 - k * 30, 21, t); }
  });
  drawFx(c, ui.fx);
  hud(c, s, s.def.hint);
  if (s.hasKey) D.drawItem(c, 'key', 130, 27, 14);
  if (s.boss && s.boss.hp > 0) for (let i = 0; i < s.boss.maxHp; i++) { c.fillStyle = i < s.boss.hp ? '#ff6f9f' : 'rgba(255,255,255,.25)'; D.heart(c, W / 2 - (s.boss.maxHp - 1) * 15 + i * 30, 78, 11); c.fill(); }
  if (s.chest === 'open') {
    const k = Math.min(1, (3.2 - s.doneT) / 0.5);
    c.save(); c.translate(W / 2, 330); c.rotate(t * 0.6); c.fillStyle = 'rgba(255,240,170,.35)';
    for (let i = 0; i < 8; i++) { c.rotate(D.TAU / 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(-22, -130 * k); c.lineTo(22, -130 * k); c.fill(); }
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(W / 2, 330, 70 * k, 0, D.TAU); c.fill();
    D.drawItem(c, s.def.item, W / 2, 334, 40 * k, t);
    c.fillStyle = 'rgba(20,12,50,.85)'; D.rr(c, 180, 440, 600, 70, 24); c.fill();
    D.text(c, `${s.def.itemName}を てにいれた！`, W / 2, 476, 28, '#ffe9a8');
  } else if (ui.touch) {
    // スティック と「えいっ」ボタン
    if (ui.stick) { c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.arc(ui.stick.ox, ui.stick.oy, 62, 0, D.TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(ui.stick.ox + ui.stick.vx * 44, ui.stick.oy + ui.stick.vy * 44, 28, 0, D.TAU); c.fill(); }
    c.fillStyle = s.cool > 0 ? 'rgba(255,216,74,.55)' : 'rgba(255,216,74,.9)'; c.beginPath(); c.arc(ACT_BTN.x, ACT_BTN.y, ACT_BTN.r, 0, D.TAU); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke(); D.text(c, 'えいっ', ACT_BTN.x, ACT_BTN.y + 2, 30, '#8a4a00');
  }
}

// ===================== リズム =====================
export function drawRhythm(c, s, ui) {
  const t = ui.t, st = s.t, beat = st * s.def.bpm / 60, bp = ((beat % 1) + 1) % 1, ratio = rhythmRatio(s);
  D.bgStage(c, t);
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(W / 2, 270, 250, 46, 0, 0, D.TAU); c.fill();
  if (s.def.noise) {   // じゃまな ノイズ。じょうずに タッチ すると きえて いく
    const amt = Math.max(0, 1 - ratio * 1.4);
    for (let i = 0; i < 6; i++) { const x = i < 3 ? 70 + i * 90 : W - 70 - (i - 3) * 90; c.globalAlpha = amt; D.drawBug(c, x, 110 + Math.sin(t * 3 + i) * 12, 24 * (0.5 + amt * 0.6), { t: t + i }); }
    c.globalAlpha = 1;
  }
  const hop = Math.max(0, 1 - bp * 2.5), jump = ui.jump > 0 ? Math.sin((1 - ui.jump / 0.35) * Math.PI) * 34 : 0;
  if (s.def.duet) D.drawBug(c, W / 2 + 130 + Math.sin(beat * Math.PI) * 14, 200 - hop * 12, 40, { t, mood: 'happy', glitch: 0 });
  D.drawPunyu(c, W / 2 - (s.def.duet ? 70 : 0) + Math.sin(beat * Math.PI) * 16, 196 - hop * 10 - jump, 56, { t, costume: 'idol', squash: hop * 0.08, eyes: s.combo >= 4 ? 'happy' : 'open', mouth: st > 0 ? 'open' : 'smile' });
  // わっか と ながれてくる ひかり
  LANE_X.forEach((x, i) => {
    if (ui.laneFlash[i] > 0) { c.fillStyle = LANE_COL[i]; c.globalAlpha = ui.laneFlash[i] * 1.6; c.beginPath(); c.arc(x, HIT_Y, 82, 0, D.TAU); c.fill(); c.globalAlpha = 1; }
    c.fillStyle = 'rgba(20,10,50,.45)'; c.beginPath(); c.arc(x, HIT_Y, 58, 0, D.TAU); c.fill();
    c.strokeStyle = LANE_COL[i]; c.lineWidth = 8; c.beginPath(); c.arc(x, HIT_Y, 54 + hop * 3, 0, D.TAU); c.stroke();
    c.fillStyle = LANE_COL[i]; c.globalAlpha = 0.5;
    if (i === 0) { D.heart(c, x, HIT_Y, 20); c.fill(); } else if (i === 1) { D.star(c, x, HIT_Y, 24); c.fill(); } else { c.beginPath(); c.arc(x, HIT_Y, 16, 0, D.TAU); c.fill(); }
    c.globalAlpha = 1;
  });
  for (const n of s.notes) {
    if (n.res && n.res !== 'miss') continue;
    const dtn = n.t - st;
    if (dtn > RH.FALL || dtn < -0.5) continue;
    const k = 1 - dtn / RH.FALL, x = W / 2 + (LANE_X[n.lane] - W / 2) * k, y = 250 + (HIT_Y - 250) * k, r = 14 + Math.min(1, k) * 32, col = LANE_COL[n.lane];
    c.globalAlpha = n.res === 'miss' ? 0.3 : 1;
    if (!n.res && k > 0.25) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.globalAlpha = 0.7; c.beginPath(); c.arc(LANE_X[n.lane], HIT_Y, 54 + Math.max(0, 1 - k) * 90, 0, D.TAU); c.stroke(); c.globalAlpha = 1; }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r + 5, 0, D.TAU); c.fill();
    c.fillStyle = col;
    if (n.lane === 0) { D.heart(c, x, y, r * 0.8); c.fill(); } else if (n.lane === 1) { D.star(c, x, y, r); c.fill(); } else { c.beginPath(); c.arc(x, y, r * 0.8, 0, D.TAU); c.fill(); }
    c.globalAlpha = 1;
  }
  // ペンライト
  for (let i = 0; i < 24; i++) { c.fillStyle = LANE_COL[i % 3]; const sw = Math.sin(beat * Math.PI + i) * 10; c.fillRect(20 + i * 40 + sw, 512 - (i % 2) * 6, 6, 28); }
  drawFx(c, ui.fx);
  hud(c, s);
  c.fillStyle = 'rgba(0,0,0,.35)'; D.rr(c, 280, 16, 400, 22, 11); c.fill();
  const g = c.createLinearGradient(280, 0, 680, 0); g.addColorStop(0, '#ff7fc4'); g.addColorStop(1, '#ffd84a');
  c.fillStyle = g; D.rr(c, 280, 16, Math.max(22, 400 * Math.min(1, ratio)), 22, 11); c.fill();
  D.text(c, 'きらきら', 230, 27, 18, '#fff');
  if (s.combo >= 3) D.text(c, `${s.combo} れんぞく！`, W / 2, 86, 26, '#fff', { stroke: '#ff5fae' });
  const first = s.notes[0].t, cnt = Math.ceil((first - st) * s.def.bpm / 60);
  if (st < first - 0.2) D.text(c, cnt > 4 ? 'よーい…' : String(cnt), W / 2, 340, cnt > 4 ? 40 : 70, '#fff', { stroke: '#ff5fae' });
}

// ===================== タイトル・ひろば・けっか =====================
const blink = t => Math.sin(t * 4) > -0.3;

export function drawBoot(c, t) {
  D.bgRoom(c, t);
  D.drawConsole(c, 690, 300, 1.25, t, s => { D.screenNoise(s, t, 0.6); });
  D.drawBug(c, 800, 120 + Math.sin(t * 3) * 8, 34, { t });
  // がめんに すいこまれかけの ぷにゅ
  D.drawPunyu(c, 560 + Math.sin(t * 2) * 8, 300 + Math.cos(t * 2.4) * 8, 54, { t, mouth: 'open', dir: 1 });
  c.save(); c.translate(300, 150); c.rotate(-0.04);
  D.text(c, 'ぷにゅ、', -130, -60, 44, '#ff5fae', { stroke: '#fff', sw: 12 });
  D.text(c, 'ゲームに', -40, 0, 66, '#5a3fd0', { stroke: '#fff', sw: 16 });
  D.text(c, 'はいっちゃった！', 20, 78, 58, '#ff5fae', { stroke: '#fff', sw: 16 });
  c.restore();
  if (blink(t)) D.text(c, 'タッチ して はじめる', 300, 440, 30, '#fff', { stroke: '#5a3fd0' });
}

export function drawHub(c, t, save) {
  D.bgTunnel(c, t * 0.25, '#6b5fd0', '#1a1240');
  D.text(c, 'どの ゲームに はいる？', W / 2, 62, 40, '#fff', { stroke: '#5a3fd0' });
  const unlocked = finalUnlocked(save, WORLDS.map(w => w.id));
  for (const card of HUB_CARDS) {
    const w = card.world, isFinal = w.id === 'bug', locked = isFinal && !unlocked, rec = save.worlds[w.id];
    const cx = card.x + card.w / 2, cy = card.y + card.h / 2 + Math.sin(t * 2 + card.x) * 5;
    D.drawCart(c, cx, cy, card.w, card.h, w, { locked, t });
    if (locked) { D.text(c, '？？？', cx, cy - 40, 40, '#9aa0b8'); D.text(c, 'みっつ クリアで', cx, cy + 22, 18, '#c9cedd'); D.text(c, 'ひらくよ', cx, cy + 46, 18, '#c9cedd'); }
    else {
      if (w.id === 'star') D.drawPunyu(c, cx, cy - 38, 30, { t, costume: 'star' });
      else if (w.id === 'hero') D.drawPunyu(c, cx, cy - 38, 30, { t, costume: 'hero' });
      else if (w.id === 'idol') D.drawPunyu(c, cx, cy - 38, 30, { t, costume: 'idol' });
      else D.drawBug(c, cx, cy - 34, 34, { t });
      D.text(c, w.title[0], cx, cy + 22, w.title[0].length > 6 ? 19 : 23, '#fff', { stroke: 'rgba(0,0,0,.45)' });
      D.text(c, w.title[1], cx, cy + 50, w.title[1].length > 6 ? 19 : 23, '#fff', { stroke: 'rgba(0,0,0,.45)' });
      for (let i = 0; i < 3; i++) { c.fillStyle = rec?.clear && i < rec.stars ? D.COL.gold : 'rgba(90,90,120,.35)'; D.star(c, cx - 34 + i * 34, cy + card.h / 2 - 17, 12); c.fill(); }
      if (rec?.clear) { c.fillStyle = '#ff5fae'; D.rr(c, card.x + card.w - 78, card.y - 6 + (cy - card.y - card.h / 2), 84, 30, 15); c.fill(); D.text(c, 'クリア', card.x + card.w - 36, card.y + 10 + (cy - card.y - card.h / 2), 17, '#fff'); }
    }
  }
  D.drawPunyu(c, 90, 470 - Math.abs(Math.sin(t * 3)) * 8, 44, { t, eyes: save.ending ? 'happy' : 'open' });
  D.text(c, save.ending ? 'ぜんぶ クリア！ おめでとう！' : unlocked ? 'さいごの ゲームが ひらいたよ！' : 'カセットを タッチ してね', 150, 478, 22, '#fff', { align: 'left', stroke: 'rgba(0,0,0,.4)' });
  button(c, HUB_BTNS.story, 'おはなし', { size: 21 });
  button(c, HUB_BTNS.sound, save.sound ? 'おと：オン' : 'おと：オフ', { size: 21 });
}

function logo(c, lines, x, y, size, fill, stroke, t, o = {}) {
  lines.forEach((ln, i) => {
    const yy = y + i * size * 1.15 + Math.sin(t * 2 + i) * 4;
    if (o.shadow) D.text(c, ln, x + 5, yy + 6, size, o.shadow, { stroke: o.shadow, sw: size * 0.3 });
    D.text(c, ln, x, yy, size, fill, { stroke, sw: size * 0.26 });
  });
}
export function drawWorldTitle(c, world, t, save) {
  const id = world.id, rec = save.worlds[id], stage = (rec?.reached || 0) + 1;
  if (id === 'star') {
    D.bgSky(c, t);
    c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(790, 120, 70, 0, D.TAU); c.fill(); c.fillStyle = '#3a1f73'; c.beginPath(); c.arc(762, 104, 62, 0, D.TAU); c.fill();
    for (let i = 0; i < 5; i++) { const k = ((t * 0.5 + i * 0.37) % 1), x = 900 - k * 700 - i * 60, y = -40 + k * 420 + i * 30; c.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60, y - 36); c.stroke(); c.fillStyle = D.COL.gold; D.star(c, x, y, 9, t * 4); c.fill(); }
    const g = c.createLinearGradient(0, 110, 0, 300); g.addColorStop(0, '#fff3a8'); g.addColorStop(1, '#ff8fd0');
    logo(c, world.title, 420, 150, 88, g, '#3b2aa8', t, { shadow: 'rgba(20,10,60,.6)' });
    D.drawLuna(c, 800, 330 + Math.sin(t * 2) * 8, 46, { t });
    D.drawPunyu(c, 150, 400 + Math.sin(t * 2.4) * 10, 74, { t, costume: 'star', dir: 1 });
  } else if (id === 'hero') {
    pixelate(c, p => { D.bgField(p, t); D.drawPunyu(p, 190, 400 - Math.abs(Math.sin(t * 3)) * 8, 76, { t, costume: 'hero', dir: 1, swing: Math.max(0, Math.sin(t * 2)) * 0.3 }); D.drawSlime(p, 800, 440, 44, { t }); D.drawSlime(p, 700, 470, 30, { t: t + 2, color: '#ff9fb8' }); });
    c.save(); c.translate(500, 185); c.rotate(-1.05); c.fillStyle = '#eaf6ff'; c.strokeStyle = '#3a2a10'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(-13, 120); c.lineTo(-13, -330); c.lineTo(0, -362); c.lineTo(13, -330); c.lineTo(13, 120); c.closePath(); c.stroke(); c.fill();
    c.fillStyle = D.COL.gold; c.fillRect(-44, 120, 88, 18); c.strokeRect(-44, 120, 88, 18); c.fillStyle = '#b5651d'; c.fillRect(-10, 138, 20, 50); c.strokeRect(-10, 138, 20, 50); c.restore();
    logo(c, world.title, 500, 150, 70, '#ffd84a', '#5a2a10', t, { shadow: 'rgba(40,20,0,.5)' });
  } else if (id === 'idol') {
    D.bgStage(c, t);
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#ffd0e8'; D.heart(c, 80 + i * 115, 60 + Math.sin(t * 2 + i) * 10, 16); c.fill(); }
    logo(c, world.title, W / 2, 140, 72, '#fff', '#ff3f9a', t, { shadow: 'rgba(120,20,90,.5)' });
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(170, 480, 150, 30, 0, 0, D.TAU); c.fill();
    D.drawPunyu(c, 170, 400 - Math.abs(Math.sin(t * 4)) * 14, 76, { t, costume: 'idol', eyes: 'happy', mouth: 'open' });
    for (let i = 0; i < 3; i++) { c.fillStyle = ['#ff7fc4', '#ffd84a', '#5fe3ff'][i]; c.beginPath(); c.arc(730 + i * 70, 420 + Math.sin(t * 4 + i) * 10, 26, 0, D.TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke(); }
  } else {
    D.bgGlitch(c, t);
    const j = Math.floor(t * 8) % 5 === 0 ? 6 : 0;
    logo(c, world.title, W / 2 - 4 - j, 150, 76, '#58f0a0', 'rgba(0,0,0,0)', t); logo(c, world.title, W / 2 + 4 + j, 150, 76, '#ff7fc4', 'rgba(0,0,0,0)', t);
    logo(c, world.title, W / 2, 150, 76, '#fff', '#1a0b33', t);
    D.drawBug(c, 760, 400 + Math.sin(t * 5) * 8, 76, { t }); D.drawPunyu(c, 190, 410, 66, { t, costume: ['star', 'hero', 'idol'][Math.floor(t * 1.2) % 3], dir: 1 });
  }
  c.fillStyle = 'rgba(20,12,50,.7)'; D.rr(c, W / 2 - 170, 318, 340, 40, 20); c.fill();
  D.text(c, world.sub, W / 2, 339, 21, '#fff');
  if (blink(t)) D.text(c, 'タッチ して スタート', W / 2, 400, 34, '#fff', { stroke: world.id === 'idol' ? '#ff3f9a' : '#3b2aa8' });
  for (let i = 0; i < 3; i++) { c.fillStyle = i < stage - 1 ? D.COL.gold : i === stage - 1 ? '#fff' : 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(W / 2 - 30 + i * 30, 448, i === stage - 1 ? 9 : 7, 0, D.TAU); c.fill(); }
  D.text(c, `ステージ ${stage}`, W / 2, 478, 19, '#fff', { stroke: 'rgba(0,0,0,.5)' });
  D.text(c, 'ぷにゅ ゲームズ', W - 20, H - 18, 15, 'rgba(255,255,255,.8)', { align: 'right' });
  button(c, BACK_BTN, '◀ もどる', { size: 20 });
}

// ステージの はじまり と おわり の ふだ
export function drawStageCard(c, run, t) {
  const k = Math.min(1, t / 0.3);
  c.fillStyle = `rgba(15,10,40,${0.55 * k})`; c.fillRect(0, 0, W, H);
  c.save(); c.translate(W / 2, H / 2); c.scale(0.8 + k * 0.2, 0.8 + k * 0.2);
  c.fillStyle = '#fff'; D.rr(c, -330, -120, 660, 240, 30); c.fill();
  c.fillStyle = run.world.color; D.rr(c, -330, -120, 660, 62, 30); c.fill(); c.fillRect(-330, -90, 660, 32);
  D.text(c, `ステージ ${run.i + 1}`, 0, -88, 26, '#fff');
  D.drawPunyu(c, -235, 30, 52, { t, costume: run.def.costume, eyes: 'happy' });
  D.text(c, run.def.name, 60, -8, run.def.name.length > 10 ? 30 : 36, '#3b2aa8');
  const lines = D.wrap(c, run.def.hint, 420, 20);
  lines.forEach((ln, i) => D.text(c, ln, 60, 44 + i * 28, 20, '#6a5a8a'));
  c.restore();
}
export function drawStageClear(c, run, t) {
  const k = Math.min(1, t / 0.35), s = 1.4 - k * 0.4;
  c.save(); c.translate(W / 2, 250); c.scale(s, s); c.rotate(-0.05);
  D.text(c, 'ステージ クリア！', 0, 0, 68, '#ffd84a', { stroke: '#fff', sw: 18 }); D.text(c, 'ステージ クリア！', 0, 0, 68, '#ff5fae', { stroke: '#5a2d8a', sw: 8 });
  c.restore();
}

export function drawResult(c, world, stars, t) {
  worldBg(c, world.id, t);
  c.fillStyle = 'rgba(15,10,40,.45)'; c.fillRect(0, 0, W, H);
  D.text(c, world.id === 'bug' ? 'ぜんぶ クリア！' : 'ゲーム クリア！', W / 2, 90, 64, '#ffd84a', { stroke: '#5a2d8a', sw: 14 });
  for (let i = 0; i < 3; i++) {
    const k = Math.max(0, Math.min(1, (t - 0.5 - i * 0.45) / 0.3)), on = i < stars;
    c.fillStyle = 'rgba(255,255,255,.2)'; D.star(c, W / 2 - 130 + i * 130, 210, 52); c.fill();
    if (on && k > 0) { c.fillStyle = D.COL.gold; D.star(c, W / 2 - 130 + i * 130, 210, 52 * (1.5 - k * 0.5), (1 - k) * 2); c.fill(); }
  }
  D.drawPunyu(c, W / 2, 380 - Math.abs(Math.sin(t * 5)) * 16, 66, { t, costume: world.id === 'bug' ? 'none' : world.costume, eyes: 'happy', mouth: 'open' });
  if (world.id === 'bug') D.drawBug(c, W / 2 + 140, 390 - Math.abs(Math.sin(t * 5 + 1)) * 14, 50, { t, mood: 'happy', glitch: 0 });
  if (t > 2 && blink(t)) D.text(c, 'タッチ して もどる', W / 2, 496, 28, '#fff', { stroke: '#5a3fd0' });
}

export function drawPause(c, save) {
  c.fillStyle = 'rgba(15,10,40,.72)'; c.fillRect(0, 0, W, H);
  D.text(c, 'ひとやすみ', W / 2, 92, 48, '#fff', { stroke: '#5a3fd0' });
  for (const it of PAUSE_ITEMS) button(c, it, it.label === 'おと' ? (save.sound ? 'おと：オン' : 'おと：オフ') : it.label, { size: 26 });
}
