// 紋章・宝箱・コウモリの絵（2D canvas）。どれも中心 (0,0)、一辺 s の正方形に収まるように描く。
// 紋章はすべて同じ色にして、形だけで見分けさせる（色で答えられないように）。

const EMBLEM_FILL = '#f7e8bb';
const EMBLEM_GLOW = 'rgba(255, 205, 110, .85)';

export function drawEmblem(ctx, kind, s) {
  ctx.save();
  ctx.fillStyle = EMBLEM_FILL;
  ctx.shadowColor = EMBLEM_GLOW;
  ctx.shadowBlur = s * 0.12;
  if (kind === 'sun') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const c = Math.cos(a), si = Math.sin(a);
      const w = 0.09 * s;
      ctx.beginPath();
      ctx.moveTo(c * s * 0.29 - si * w, si * s * 0.29 + c * w);
      ctx.lineTo(c * s * 0.48, si * s * 0.48);
      ctx.lineTo(c * s * 0.29 + si * w, si * s * 0.29 - c * w);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === 'moon') {
    // 三日月：外側の円弧と、ずらした円の内側の円弧でつくる
    const r1 = s * 0.42, r2 = s * 0.36, ox = s * 0.2, oy = -s * 0.08;
    const d = Math.hypot(ox, oy);
    const a = (d * d + r1 * r1 - r2 * r2) / (2 * d);
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const ux = ox / d, uy = oy / d;
    const px = ux * a, py = uy * a;
    const p1 = [px - uy * h, py + ux * h];
    const p2 = [px + uy * h, py - ux * h];
    ctx.beginPath();
    ctx.arc(0, 0, r1, Math.atan2(p1[1], p1[0]), Math.atan2(p2[1], p2[0]), false);
    ctx.arc(ox, oy, r2, Math.atan2(p2[1] - oy, p2[0] - ox), Math.atan2(p1[1] - oy, p1[0] - ox), true);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = (i % 2 ? 0.2 : 0.48) * s;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r + s * 0.03);
    }
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'crown') {
    const p = [[-0.42, 0.3], [0.42, 0.3], [0.44, -0.24], [0.2, 0.02], [0, -0.34], [-0.2, 0.02], [-0.44, -0.24]];
    ctx.beginPath();
    p.forEach(([x, y]) => ctx.lineTo(x * s, y * s));
    ctx.closePath();
    ctx.fill();
    for (const [x, y] of [[0.44, -0.29], [0, -0.39], [-0.44, -0.29]]) {
      ctx.beginPath();
      ctx.arc(x * s, y * s, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 宝箱（fake=true でミミック＝偽の宝箱。形はほぼ同じで、色と歯が違う）
export function drawChest(ctx, s, fake = false) {
  ctx.save();
  if (!fake) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.62);
    g.addColorStop(0, 'rgba(255, 214, 120, .55)');
    g.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-s * 0.62, -s * 0.62, s * 1.24, s * 1.24);
  }
  const body = fake ? '#5d4c73' : '#a8652a';
  const lid = fake ? '#6f5d86' : '#c27a33';
  const band = fake ? '#a497bd' : '#f4c451';
  // 本体
  ctx.fillStyle = body;
  roundRect(ctx, -s * 0.42, -s * 0.02, s * 0.84, s * 0.36, s * 0.04);
  ctx.fill();
  // ふた
  ctx.fillStyle = lid;
  ctx.beginPath();
  ctx.moveTo(-s * 0.42, -s * 0.02);
  ctx.bezierCurveTo(-s * 0.42, -s * 0.34, s * 0.42, -s * 0.34, s * 0.42, -s * 0.02);
  ctx.closePath();
  ctx.fill();
  // 金具
  ctx.fillStyle = band;
  ctx.fillRect(-s * 0.3, -s * 0.24, s * 0.08, s * 0.58);
  ctx.fillRect(s * 0.22, -s * 0.24, s * 0.08, s * 0.58);
  ctx.fillRect(-s * 0.42, -s * 0.05, s * 0.84, s * 0.06);
  if (fake) {
    // 歯
    ctx.fillStyle = '#f3eee6';
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = -s * 0.4 + (i * s * 0.8) / 8;
      ctx.lineTo(x, i % 2 ? s * 0.1 : s * 0.01);
    }
    ctx.lineTo(s * 0.4, s * 0.01);
    ctx.closePath();
    ctx.fill();
    // 目
    ctx.fillStyle = '#ff4a5a';
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.15, s * 0.035, 0, Math.PI * 2);
    ctx.arc(s * 0.1, -s * 0.15, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#3a1f0c';
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-s * 0.015, s * 0.1, s * 0.03, s * 0.08);
  }
  ctx.restore();
}

export function drawBat(ctx, s) {
  ctx.save();
  ctx.fillStyle = '#2b1a3a';
  ctx.strokeStyle = 'rgba(190, 150, 235, .75)';
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.1);
  ctx.bezierCurveTo(s * 0.18, -s * 0.28, s * 0.36, -s * 0.2, s * 0.48, -s * 0.12);
  ctx.quadraticCurveTo(s * 0.4, 0, s * 0.36, s * 0.1);
  ctx.quadraticCurveTo(s * 0.3, s * 0.02, s * 0.22, s * 0.1);
  ctx.quadraticCurveTo(s * 0.15, s * 0.04, s * 0.08, s * 0.14);
  ctx.lineTo(0, s * 0.2);
  ctx.lineTo(-s * 0.08, s * 0.14);
  ctx.quadraticCurveTo(-s * 0.15, s * 0.04, -s * 0.22, s * 0.1);
  ctx.quadraticCurveTo(-s * 0.3, s * 0.02, -s * 0.36, s * 0.1);
  ctx.quadraticCurveTo(-s * 0.4, 0, -s * 0.48, -s * 0.12);
  ctx.bezierCurveTo(-s * 0.36, -s * 0.2, -s * 0.18, -s * 0.28, 0, -s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 耳
  ctx.beginPath();
  ctx.moveTo(-s * 0.07, -s * 0.12);
  ctx.lineTo(-s * 0.05, -s * 0.24);
  ctx.lineTo(0, -s * 0.13);
  ctx.lineTo(s * 0.05, -s * 0.24);
  ctx.lineTo(s * 0.07, -s * 0.12);
  ctx.fill();
  ctx.fillStyle = '#ff5566';
  ctx.beginPath();
  ctx.arc(-s * 0.035, -s * 0.06, s * 0.02, 0, Math.PI * 2);
  ctx.arc(s * 0.035, -s * 0.06, s * 0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
