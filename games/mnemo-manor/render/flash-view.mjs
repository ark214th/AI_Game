// 閃光フェーズの描画。
// 閃光とマスクは、前もって別の canvas に描いておき、本番のフレームでは drawImage 1回だけにする
// （閃光の最中に重い処理をしない：DESIGN.md 10.3）。

import { EMBLEMS, dirAngle } from '../core/flash/flash.mjs';
import { drawEmblem, drawChest, drawBat } from './sprites.mjs';

const THEMES = {
  corridor: { floor: '#3a2f33', tile: '#4a3b3c', light: 'rgba(255, 196, 120, .55)' },
  fog: { floor: '#343a40', tile: '#434a51', light: 'rgba(225, 230, 240, .42)' },
  storm: { floor: '#262c3e', tile: '#323a52', light: 'rgba(190, 210, 255, .45)' },
  lake: { floor: '#1d3140', tile: '#27455a', light: 'rgba(170, 225, 255, .45)' },
};
export const THEME_NAMES = { corridor: '石の回廊', fog: '霧の間', storm: '嵐の塔', lake: '地底湖' };

// 描画だけに使う乱数（見た目のゆらぎ。ゲームの判定には関わらない）
let vseed = 12345;
const vr = () => ((vseed = (vseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

function makeCanvas(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { c, ctx };
}

export function createFlashView(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const v = {
    w: 0, h: 0, dpr: 1, cx: 0, cy: 0, R: 0,
    sprites: {}, bgs: {}, masks: [], stim: null, trial: null, fb: null,
  };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    v.w = w; v.h = h; v.dpr = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const top = 56; // HUD の分
    v.cx = w / 2;
    v.cy = top + (h - top) / 2;
    v.R = Math.min(w / 2, (h - top) / 2) * 0.94;
    buildSprites();
    buildBackgrounds();
    buildMasks();
    v.stim = makeCanvas(w, h, dpr);
    if (v.trial) prepare(v.trial);
  }

  function buildSprites() {
    const es = v.R * 0.2, is = v.R * 0.18;
    const mk = (size, fn) => {
      const pad = size * 0.8;
      const { c, ctx: g } = makeCanvas(size + pad, size + pad, v.dpr);
      g.translate((size + pad) / 2, (size + pad) / 2);
      fn(g, size);
      return { c, size: size + pad };
    };
    for (const k of EMBLEMS) v.sprites[k] = mk(es, (g, s) => drawEmblem(g, k, s));
    v.sprites.chest = mk(is, (g, s) => drawChest(g, s, false));
    v.sprites.fake = mk(is, (g, s) => drawChest(g, s, true));
    v.sprites.bat = mk(is, (g, s) => drawBat(g, s));
  }

  function buildBackgrounds() {
    for (const [name, th] of Object.entries(THEMES)) {
      const { c, ctx: g } = makeCanvas(v.w, v.h, v.dpr);
      g.fillStyle = th.floor;
      g.fillRect(0, 0, v.w, v.h);
      // 石畳
      const t = Math.max(26, v.R * 0.16);
      vseed = 99 + name.length;
      for (let y = (v.cy % t) - t; y < v.h; y += t) {
        const off = (Math.round(y / t) % 2) * t * 0.5;
        for (let x = -t + off; x < v.w + t; x += t) {
          g.fillStyle = th.tile;
          g.globalAlpha = 0.35 + vr() * 0.4;
          g.fillRect(x + 2, y + 2, t - 4, t - 4);
        }
      }
      g.globalAlpha = 1;
      if (name === 'lake') {
        g.strokeStyle = 'rgba(160, 220, 255, .18)';
        g.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          g.beginPath();
          g.ellipse(v.cx, v.cy, v.R * (0.2 + i * 0.09), v.R * (0.08 + i * 0.035), 0, 0, Math.PI * 2);
          g.stroke();
        }
      }
      // ランタンの光（中心が明るく、外が暗い）
      const lg = g.createRadialGradient(v.cx, v.cy, v.R * 0.05, v.cx, v.cy, v.R * 1.25);
      lg.addColorStop(0, th.light);
      lg.addColorStop(0.7, 'rgba(0,0,0,.15)');
      lg.addColorStop(1, 'rgba(0,0,0,.85)');
      g.fillStyle = lg;
      g.fillRect(0, 0, v.w, v.h);
      v.bgs[name] = c;
    }
  }

  // パターンマスク：紋章・宝箱・コウモリのかけらと煙を画面いっぱいにばらまく
  function buildMasks() {
    v.masks = [];
    const pieces = [...EMBLEMS, 'chest', 'fake', 'bat'];
    for (let m = 0; m < 3; m++) {
      const { c, ctx: g } = makeCanvas(v.w, v.h, v.dpr);
      vseed = 777 + m * 31;
      g.fillStyle = '#120e18';
      g.fillRect(0, 0, v.w, v.h);
      for (let i = 0; i < 70; i++) {
        const a = vr() * Math.PI * 2, r = Math.sqrt(vr()) * v.R * 1.15;
        const x = v.cx + Math.cos(a) * r, y = v.cy + Math.sin(a) * r;
        const sg = g.createRadialGradient(x, y, 0, x, y, v.R * (0.1 + vr() * 0.25));
        sg.addColorStop(0, `rgba(${150 + vr() * 80 | 0}, ${120 + vr() * 60 | 0}, ${110 + vr() * 80 | 0}, .35)`);
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sg;
        g.fillRect(0, 0, v.w, v.h);
      }
      const count = 150;
      for (let i = 0; i < count; i++) {
        // 3割は中心付近に集め、紋章の残像を確実に消す
        const near = i < count * 0.3;
        const a = vr() * Math.PI * 2;
        const r = near ? vr() * v.R * 0.25 : Math.sqrt(vr()) * v.R * 1.1;
        const x = v.cx + Math.cos(a) * r, y = v.cy + Math.sin(a) * r;
        const sp = v.sprites[pieces[(vr() * pieces.length) | 0]];
        const sc = 0.5 + vr() * 0.8;
        const fw = sp.size * sc * (0.3 + vr() * 0.5), fh = sp.size * sc * (0.3 + vr() * 0.5);
        g.save();
        g.translate(x, y);
        g.rotate(vr() * Math.PI * 2);
        g.beginPath();
        g.rect(-fw / 2, -fh / 2, fw, fh);
        g.clip();
        g.globalAlpha = 0.55 + vr() * 0.45;
        g.drawImage(sp.c, -sp.size * sc / 2 + (vr() - 0.5) * fw, -sp.size * sc / 2 + (vr() - 0.5) * fh, sp.size * sc, sp.size * sc);
        g.restore();
      }
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = vr() < 0.5 ? 'rgba(255,240,210,.35)' : 'rgba(0,0,0,.5)';
        g.fillRect(vr() * v.w, vr() * v.h, 2, 2);
      }
      v.masks.push(c);
    }
  }

  const pos = (dir, ecc) => {
    const a = dirAngle(dir);
    return [v.cx + Math.cos(a) * ecc * v.R, v.cy + Math.sin(a) * ecc * v.R];
  };

  const blit = (g, sp, x, y, scale = 1) => {
    const s = sp.size * scale;
    g.drawImage(sp.c, x - s / 2, y - s / 2, s, s);
  };

  // 閃光の絵を前もって描いておく
  function prepare(trial) {
    v.trial = trial;
    const g = v.stim.ctx;
    g.globalAlpha = 1;
    g.drawImage(v.bgs[trial.theme] || v.bgs.corridor, 0, 0, v.w, v.h);
    if (trial.reflection) {
      const [x, y] = pos(trial.reflection.dir, trial.reflection.ecc);
      g.save();
      g.globalAlpha = 0.32;
      g.translate(x, y);
      g.scale(1, -1);
      blit(g, v.sprites.chest, 0, 0, 0.95);
      g.restore();
      g.strokeStyle = 'rgba(150, 215, 255, .22)';
      g.lineWidth = 1.5;
      for (let k = 1; k <= 3; k++) {
        g.beginPath();
        g.ellipse(x, y, v.R * 0.06 * k, v.R * 0.025 * k, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    for (const d of trial.distractors) {
      const [x, y] = pos(d.dir, d.ecc);
      blit(g, v.sprites[d.kind], x, y);
    }
    if (trial.target) {
      const [x, y] = pos(trial.target.dir, trial.target.ecc);
      blit(g, v.sprites.chest, x, y);
    }
    blit(g, v.sprites[EMBLEMS[trial.emblem]], v.cx, v.cy);
    if (trial.theme === 'fog') {
      g.fillStyle = 'rgba(175, 185, 200, .3)';
      g.fillRect(0, 0, v.w, v.h);
    } else if (trial.theme === 'storm') {
      vseed = (trial.emblem + 1) * 1009 + (trial.target ? trial.target.dir : 0);
      g.strokeStyle = 'rgba(200, 220, 255, .28)';
      g.lineWidth = 1.2;
      g.beginPath();
      for (let i = 0; i < 160; i++) {
        const x = vr() * v.w, y = vr() * v.h, l = 10 + vr() * 22;
        g.moveTo(x, y);
        g.lineTo(x - l * 0.25, y + l);
      }
      g.stroke();
      for (let i = 0; i < 900; i++) {
        g.fillStyle = vr() < 0.5 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.3)';
        g.fillRect(vr() * v.w, vr() * v.h, 2, 2);
      }
    }
    v.maskIndex = (v.maskIndex + 1 || 0) % v.masks.length;
  }

  function drawStim() {
    ctx.drawImage(v.stim.c, 0, 0, v.w, v.h);
  }

  function drawMask() {
    ctx.drawImage(v.masks[v.maskIndex || 0], 0, 0, v.w, v.h);
  }

  // 暗闇（注視点）。dark: 0〜1 で、難しくなるほど暗く、ランタンの火が小さくなる
  function drawDark(ts, { dark = 0, fixation = true } = {}) {
    ctx.fillStyle = '#07060b';
    ctx.fillRect(0, 0, v.w, v.h);
    const flick = 1 + Math.sin(ts * 0.013) * 0.04 + Math.sin(ts * 0.031) * 0.03;
    const gr = v.R * (0.55 - dark * 0.3) * flick;
    const g = ctx.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, gr);
    g.addColorStop(0, `rgba(255, 170, 80, ${0.22 - dark * 0.1})`);
    g.addColorStop(1, 'rgba(255, 170, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(v.cx - gr, v.cy - gr, gr * 2, gr * 2);
    if (fixation) {
      const s = 7;
      ctx.fillStyle = '#f2dfae';
      ctx.beginPath();
      ctx.moveTo(v.cx, v.cy - s);
      ctx.lineTo(v.cx + s, v.cy);
      ctx.lineTo(v.cx, v.cy + s);
      ctx.lineTo(v.cx - s, v.cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawAnswerBg(ts, dark = 0) {
    drawDark(ts, { dark, fixation: false });
    ctx.strokeStyle = 'rgba(242, 223, 174, .07)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const [x, y] = pos(i, 1);
      ctx.beginPath();
      ctx.moveTo(v.cx, v.cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  // ---------- 結果の演出（閃光の前後にだけ置く） ----------
  function startFeedback(trial, answer, result, ts, durMs) {
    const parts = [];
    const origin = trial.target ? pos(trial.target.dir, trial.target.ecc) : [v.cx, v.cy];
    if (result.success) {
      for (let i = 0; i < 46; i++) {
        const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 260;
        parts.push({ x: origin[0], y: origin[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0.6 + Math.random() * 0.6, age: 0, gold: Math.random() < 0.8 });
      }
    }
    v.fb = { trial, answer, result, t0: ts, last: ts, dur: durMs, parts, origin };
  }

  function ring(x, y, r, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawFeedback(ts) {
    const fb = v.fb;
    if (!fb) return true;
    // rAF の時刻は回答した瞬間より少し前のことがあるので 0 未満にしない
    const t = Math.max(0, Math.min(1, (ts - fb.t0) / fb.dur));
    const dt = Math.max(0, Math.min(0.05, (ts - fb.last) / 1000));
    fb.last = ts;
    const { trial, answer, result } = fb;
    ctx.save();
    ctx.fillStyle = '#07060b';
    ctx.fillRect(0, 0, v.w, v.h);
    if (result.success) {
      // 光が広がり、閃光で見えた部屋がもう一度現れる
      const r = v.R * 1.5 * Math.min(1, t * 2.2);
      ctx.save();
      ctx.beginPath();
      ctx.arc(v.cx, v.cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(v.stim.c, 0, 0, v.w, v.h);
      ctx.restore();
      if (trial.target) {
        const [x, y] = fb.origin;
        const lg = ctx.createLinearGradient(v.cx, v.cy, x, y);
        lg.addColorStop(0, 'rgba(255, 230, 150, 0)');
        lg.addColorStop(1, `rgba(255, 230, 150, ${0.8 * (1 - t)})`);
        ctx.strokeStyle = lg;
        ctx.lineWidth = v.R * 0.09;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(v.cx, v.cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ring(x, y, v.R * (0.1 + t * 0.2), `rgba(255, 220, 120, ${1 - t})`, 4);
      }
      ring(v.cx, v.cy, v.R * (0.12 + t * 0.15), `rgba(255, 240, 190, ${1 - t})`, 3);
    } else {
      // 失敗：画面がゆれて赤黒く沈む。何があったかは薄く見せる（答え合わせ）
      const shake = (1 - t) * 10;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      ctx.globalAlpha = 0.45;
      ctx.drawImage(v.stim.c, 0, 0, v.w, v.h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(120, 0, 25, ${0.4 * (1 - t)})`;
      ctx.fillRect(-20, -20, v.w + 40, v.h + 40);
      const pulse = 0.6 + 0.4 * Math.sin(t * Math.PI * 6);
      ring(v.cx, v.cy, v.R * 0.14, result.emblemOk ? `rgba(255, 220, 120, ${pulse})` : `rgba(255, 80, 90, ${pulse})`, 4);
      if (trial.target) {
        const [x, y] = pos(trial.target.dir, trial.target.ecc);
        ring(x, y, v.R * 0.13, `rgba(255, 220, 120, ${pulse})`, 4);
        if (result.dirOk === false && answer.dir != null) {
          // 選んだ方向にはミミックが口を鳴らしている
          const [mx, my] = pos(answer.dir, trial.target.ecc);
          const chomp = 1 + Math.abs(Math.sin(t * Math.PI * 5)) * 0.25;
          ctx.globalAlpha = Math.min(1, t * 4);
          blit(ctx, v.sprites.fake, mx, my, chomp);
          ctx.globalAlpha = 1;
        }
      }
    }
    // 金の粒
    for (const p of fb.parts) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      const a = Math.max(0, 1 - p.age / p.life);
      if (a <= 0) continue;
      ctx.fillStyle = p.gold ? `rgba(255, 215, 100, ${a})` : `rgba(255, 255, 240, ${a})`;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.restore();
    return t >= 1;
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    get layout() { return { w: v.w, h: v.h, cx: v.cx, cy: v.cy, R: v.R }; },
    sprite: (k) => v.sprites[k],
    resize, prepare, drawStim, drawMask, drawDark, drawAnswerBg, startFeedback, drawFeedback,
  };
}
