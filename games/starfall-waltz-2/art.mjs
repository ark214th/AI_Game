// キャラクターの絵。画像ファイルは使わず、すべて Canvas のパスで描く。
// 座標は顔の中心が (0,0)、頭の半径が約 22。立ち絵・カットイン・フィールド上の小さな姿で同じ絵を拡大縮小して使う。
const TAU = Math.PI * 2;
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
export const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const lin = (c, x0, y0, x1, y1, ...stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };

export function starPath(c, R, r, n = 5, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r : R; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath();
}
export function gearPath(c, r, teeth, rot, depth = .2) {
  c.beginPath();
  const w = TAU / teeth, rin = r * (1 - depth);
  for (let i = 0; i < teeth; i++) {
    const a = rot + i * w;
    for (const [pa, pr] of [[a, rin], [a + w * .14, r], [a + w * .46, r], [a + w * .6, rin]]) c.lineTo(Math.cos(pa) * pr, Math.sin(pa) * pr);
  }
  c.closePath();
}

// hair: 髪の色（上→毛先）  eye: 瞳  dress: 服（上→裾）  trim: ふちどり  back: 後ろ髪の形  bangs: 前髪の房の数
export const CAST = {
  nova: {hair: ['#fff0b8', '#f5b04e'], eye: '#3aa0ff', dress: ['#2b3f9c', '#131b52'], trim: '#ffd98a', ribbon: '#ff6f8e', back: 'bob', bangs: 5, skin: '#fff1e4'},
  clem: {hair: ['#ffb46a', '#d9692a'], eye: '#ffb020', dress: ['#fff6dc', '#e2b260'], trim: '#a8651f', ribbon: '#e8435f', back: 'twin', bangs: 4, skin: '#fff3e6'},
  lumi: {hair: ['#b8ffe0', '#ff9ee0'], eye: '#ff5fb0', dress: ['#f4fffb', '#8fe6d0'], trim: '#48d6b4', ribbon: '#ff8fd0', back: 'long', bangs: 5, skin: '#fff4ec'},
  maris: {hair: ['#3a62d8', '#58e0ff'], eye: '#2ff0e0', dress: ['#1c2f7a', '#0c1440'], trim: '#e8f6ff', ribbon: '#58e0ff', back: 'wavy', bangs: 3, skin: '#f6f1f4'},
  halley: {hair: ['#ffffff', '#b8d8ff'], eye: '#ffc93a', dress: ['#28407a', '#111c3e'], trim: '#ffe08a', ribbon: '#ffe08a', back: 'pony', bangs: 4, skin: '#fff3ea'},
  nox: {hair: ['#2a1630', '#b0204e'], eye: '#ff3a6a', dress: ['#1a0d22', '#3a0a26'], trim: '#ff6f9c', ribbon: '#ffd08a', back: 'long', bangs: 4, skin: '#f6eaf0'},
  selene: {hair: ['#dfeaff', '#8fa8ff'], eye: '#a88cff', dress: ['#2a3c8a', '#0a1233'], trim: '#dfe8ff', ribbon: '#ffd98a', back: 'long', bangs: 3, skin: '#f7f2fa'},
};

function backHair(c, s, t) {
  const [h0, h1] = s.hair, sw = Math.sin(t * .04) * 2;
  c.fillStyle = lin(c, 0, -24, 0, 70, h0, mix(h0, h1, .5), h1); c.strokeStyle = mix(h1, '#000000', .45); c.lineWidth = 1.2;
  const shape = pts => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length === 2) c.lineTo(p[0], p[1]); else c.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]); } c.closePath(); c.fill(); c.stroke(); };
  if (s.back === 'bob') shape([[-23, -6], [-27, 10, -24, 24, -17, 27], [-8, 22, 8, 22, 17, 27], [24, 24, 27, 10, 23, -6], [20, -30, -20, -30, -23, -6]]);
  else if (s.back === 'twin') {
    shape([[-22, -6], [-24, 6, -22, 16, -17, 20], [17, 20], [22, 16, 24, 6, 22, -6], [20, -30, -20, -30, -22, -6]]);
    for (const sd of [-1, 1]) { // くるくるの二つ結び
      c.save(); c.translate(sd * 25, -8); c.rotate(sd * (.25 + sw * .02));
      for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(sd * (2 + i * .6), 6 + i * 11, 9.5 - i * 1.1, 7, 0, 0, TAU); c.fill(); c.stroke(); }
      c.restore();
    }
  } else if (s.back === 'pony') {
    shape([[-22, -6], [-25, 8, -22, 18, -16, 22], [16, 22], [22, 18, 25, 8, 22, -6], [20, -30, -20, -30, -22, -6]]);
    // 彗星の尾のようなポニーテール
    shape([[14, -20], [34, -26, 46 + sw, -6, 40 + sw * 2, 30], [38 + sw * 2, 52, 30 + sw * 3, 70, 22 + sw * 3, 82], [30 + sw * 2, 60, 28, 40, 26, 22], [26, 4, 22, -8, 14, -12]]);
  } else if (s.back === 'wavy') shape([[-23, -6], [-32, 14, -22, 30, -30 + sw, 48], [-34 + sw, 62, -22, 70, -18 + sw, 78], [-12, 60, -14, 44, -10, 30], [10, 30], [14, 44, 12, 60, 18 - sw, 78], [22, 70, 34 - sw, 62, 30 - sw, 48], [22, 30, 32, 14, 23, -6], [20, -30, -20, -30, -23, -6]]);
  else shape([[-23, -6], [-29, 20, -27 + sw, 52, -30 + sw, 80], [-20 + sw, 74, -14, 60, -11, 30], [11, 30], [14, 60, 20 - sw, 74, 30 - sw, 80], [27 - sw, 52, 29, 20, 23, -6], [20, -30, -20, -30, -23, -6]]);
}

function body(c, s, t) {
  const [d0, d1] = s.dress, dark = mix(d1, '#000000', .5), sway = Math.sin(t * .05) * 1.5;
  // 脚
  c.fillStyle = s.skin; c.strokeStyle = mix(s.skin, '#5a3020', .5); c.lineWidth = 1;
  for (const sd of [-1, 1]) { c.beginPath(); c.roundRect(sd * 7 - 3, 78, 6, 16, 2); c.fill(); c.stroke(); c.fillStyle = dark; c.beginPath(); c.ellipse(sd * 7.5, 95, 5, 3.2, 0, 0, TAU); c.fill(); c.fillStyle = s.skin; }
  // 腕
  for (const sd of [-1, 1]) {
    c.strokeStyle = mix(s.skin, '#5a3020', .5); c.fillStyle = s.skin;
    c.beginPath(); c.moveTo(sd * 15, 32); c.quadraticCurveTo(sd * 25, 44, sd * (24 + sway * .4), 58); c.lineTo(sd * (19 + sway * .4), 59); c.quadraticCurveTo(sd * 19, 46, sd * 11, 36); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(sd * (21.5 + sway * .4), 60, 3.4, 0, TAU); c.fill(); c.stroke();
  }
  // スカート
  c.fillStyle = lin(c, 0, 24, 0, 84, d0, d1); c.strokeStyle = dark; c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-6, 20); c.quadraticCurveTo(-17, 24, -15, 32); c.quadraticCurveTo(-9, 44, -12, 50);
  c.quadraticCurveTo(-26, 66, -32 - sway, 82); c.quadraticCurveTo(-16, 90, 0, 86); c.quadraticCurveTo(16, 90, 32 - sway, 82);
  c.quadraticCurveTo(26, 66, 12, 50); c.quadraticCurveTo(9, 44, 15, 32); c.quadraticCurveTo(17, 24, 6, 20); c.closePath(); c.fill(); c.stroke();
  // ひだ
  c.strokeStyle = rgba(dark, .45); c.lineWidth = .9;
  for (const k of [-.6, -.2, .2, .6]) { c.beginPath(); c.moveTo(k * 12, 52); c.quadraticCurveTo(k * 26, 68, k * 44 - sway, 84 + Math.abs(k) * 2); c.stroke(); }
  // 裾のふちどり
  c.strokeStyle = s.trim; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(-30 - sway, 78); c.quadraticCurveTo(-15, 85, 0, 81.5); c.quadraticCurveTo(15, 85, 30 - sway, 78); c.stroke();
  // 袖
  c.fillStyle = d0; c.strokeStyle = dark; c.lineWidth = 1.2;
  for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 15.5, 31, 7.5, 6, sd * .5, 0, TAU); c.fill(); c.stroke(); }
  // 帯
  c.fillStyle = s.trim; c.beginPath(); c.roundRect(-11.5, 46, 23, 5, 2); c.fill();
  // えりとリボン
  c.fillStyle = '#ffffff'; c.strokeStyle = rgba(dark, .6); c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, 26); c.lineTo(-12, 22); c.lineTo(-9, 31); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(0, 26); c.lineTo(12, 22); c.lineTo(9, 31); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = s.ribbon; c.strokeStyle = mix(s.ribbon, '#000000', .4);
  for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, 28); c.lineTo(sd * 9, 24); c.lineTo(sd * 8, 34); c.closePath(); c.fill(); c.stroke(); }
  c.beginPath(); c.arc(0, 28.5, 2.6, 0, TAU); c.fill(); c.stroke();
}

function face(c, s, expr, t) {
  const line = mix(s.skin, '#6a2a2a', .62);
  // 首
  c.fillStyle = mix(s.skin, '#d09080', .25); c.beginPath(); c.roundRect(-4.5, 16, 9, 9, 2); c.fill();
  // 輪郭
  c.fillStyle = lin(c, 0, -20, 0, 24, s.skin, s.skin, mix(s.skin, '#ffb0a0', .3)); c.strokeStyle = line; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-20.5, -4); c.bezierCurveTo(-21.5, 10, -12, 22, 0, 23.5); c.bezierCurveTo(12, 22, 21.5, 10, 20.5, -4);
  c.bezierCurveTo(20.5, -28, -20.5, -28, -20.5, -4); c.closePath(); c.fill(); c.stroke();
  // ほお
  c.fillStyle = 'rgba(255,120,140,.33)';
  for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 12.5, 10.5, 4.6, 2.6, 0, 0, TAU); c.fill(); }
  // 目
  const blink = expr !== 'surprise' && (t % 230) < 5;
  const dark = mix(s.eye, '#12081e', .72);
  for (const sd of [-1, 1]) {
    const ex = sd * 9.4, ey = 3.2;
    c.save(); c.translate(ex, ey);
    if (expr === 'smile' || blink) {
      c.strokeStyle = '#2a1626'; c.lineWidth = 2; c.lineCap = 'round';
      c.beginPath(); if (blink && expr !== 'smile') { c.moveTo(-5.5, 1); c.quadraticCurveTo(0, 3.5, 5.5, 1); } else { c.moveTo(-5.5, 2); c.quadraticCurveTo(0, -5, 5.5, 2); } c.stroke();
    } else {
      const big = expr === 'surprise' ? .82 : 1;
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(0, 0, 6, 7.4, 0, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.ellipse(0, 0, 6, 7.4, 0, 0, TAU); c.clip();
      if (expr === 'angry') { c.beginPath(); c.moveTo(-9, -8 + sd * 2.6 - 3.5); c.lineTo(9, -8 - sd * 2.6 - 3.5); c.lineTo(9, 12); c.lineTo(-9, 12); c.closePath(); c.clip(); }
      c.fillStyle = lin(c, 0, -7, 0, 7, dark, s.eye, mix(s.eye, '#ffffff', .55));
      c.beginPath(); c.ellipse(sd * -.4, .8, 5 * big, 6.6 * big, 0, 0, TAU); c.fill();
      c.fillStyle = dark; c.beginPath(); c.ellipse(sd * -.4, .2, 2.3 * big, 3.3 * big, 0, 0, TAU); c.fill();
      c.fillStyle = rgba(mix(s.eye, '#ffffff', .7), .7); c.beginPath(); c.ellipse(sd * -.4, 5, 3.2 * big, 1.6, 0, 0, TAU); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-2, -3, 2.1, 0, TAU); c.fill(); c.beginPath(); c.arc(2.2, 2.6, 1, 0, TAU); c.fill();
      c.restore();
      // 上まつげ
      c.strokeStyle = '#2a1626'; c.lineWidth = 2.1; c.lineCap = 'round';
      c.beginPath();
      if (expr === 'angry') { c.moveTo(-6.4, -5.6 + sd * 2.4); c.lineTo(6.4, -5.6 - sd * 2.4); }
      else { c.moveTo(-6.6 * (sd > 0 ? 1 : 1.12), -2.2); c.quadraticCurveTo(0, -10.2, 6.6 * (sd > 0 ? 1.12 : 1), -2.2); }
      c.stroke();
      c.lineWidth = .9; c.strokeStyle = rgba('#2a1626', .55); c.beginPath(); c.moveTo(-4, 7); c.quadraticCurveTo(0, 8.4, 4, 7); c.stroke();
    }
    c.restore();
    // まゆ
    c.strokeStyle = mix(s.hair[1], '#2a1020', .5); c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath();
    const by = expr === 'surprise' ? -11 : -8.6;
    if (expr === 'angry') { c.moveTo(ex - sd * 6, by - 2.4); c.lineTo(ex + sd * -(-5) * -1 + sd * 0, by + 1.6); }
    else { c.moveTo(ex - 5, by + (expr === 'smile' ? -.6 : .6)); c.quadraticCurveTo(ex, by - 2.2, ex + 5, by + (expr === 'smile' ? -.6 : .6)); }
    c.stroke();
  }
  // 鼻と口
  c.fillStyle = rgba(line, .6); c.beginPath(); c.arc(0, 10.4, .6, 0, TAU); c.fill();
  c.strokeStyle = '#8a3a44'; c.lineWidth = 1.3; c.lineCap = 'round'; c.fillStyle = '#c2475a';
  c.beginPath();
  if (expr === 'smile') { c.moveTo(-4.2, 14); c.quadraticCurveTo(0, 21, 4.2, 14); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-2.4, 14.2, 4.8, 1.3); }
  else if (expr === 'angry') { c.moveTo(-3.4, 16.4); c.quadraticCurveTo(0, 13.4, 3.4, 16.4); c.stroke(); }
  else if (expr === 'surprise') { c.ellipse(0, 16, 2.2, 2.8, 0, 0, TAU); c.fill(); c.stroke(); }
  else { c.moveTo(-3, 15); c.quadraticCurveTo(0, 17.4, 3, 15); c.stroke(); }
}

function frontHair(c, s, t) {
  const [h0, h1] = s.hair, n = s.bangs, edge = mix(h1, '#000000', .45);
  c.fillStyle = lin(c, 0, -27, 0, 22, mix(h0, '#ffffff', .25), h0, mix(h0, h1, .6)); c.strokeStyle = edge; c.lineWidth = 1.2;
  // 頭頂から額にかかる前髪。房の先をとがらせる
  c.beginPath(); c.moveTo(-22.5, 2); c.bezierCurveTo(-25, -32, 25, -32, 22.5, 2);
  c.quadraticCurveTo(21, -6, 17, -9);
  for (let i = 0; i < n; i++) {
    const x0 = 17 - (i / n) * 34, x1 = 17 - ((i + 1) / n) * 34, tip = (i === Math.floor(n / 2) ? -1.5 : 1.5) + (i % 2) * 1.6;
    c.quadraticCurveTo(x0 - 1, -3, (x0 + x1) / 2 + 1.5, tip - 3 + 2.5); c.quadraticCurveTo(x1 + 2, -5, x1, -9.5);
  }
  c.quadraticCurveTo(-21, -6, -22.5, 2); c.closePath(); c.fill(); c.stroke();
  // 横の髪
  for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 22.6, -6); c.quadraticCurveTo(sd * 25.5, 8, sd * 21, 23); c.quadraticCurveTo(sd * 19.5, 10, sd * 17.5, -7); c.closePath(); c.fill(); c.stroke(); }
  // つや
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.2; c.lineCap = 'round';
  c.beginPath(); c.arc(0, -4, 17.5, -Math.PI * .8, -Math.PI * .56); c.stroke();
  c.beginPath(); c.arc(0, -4, 17.5, -Math.PI * .46, -Math.PI * .3); c.stroke();
}

// キャラクターごとの飾り。where: 'back'（体の後ろ）か 'front'（髪の上）
function extras(c, id, where, t) {
  const s = CAST[id];
  if (id === 'nova') {
    if (where === 'back') { // 星の光の羽
      c.globalCompositeOperation = 'lighter';
      for (const sd of [-1, 1]) { c.save(); c.translate(sd * 14, 34); c.rotate(sd * (.5 + Math.sin(t * .09) * .12)); c.fillStyle = lin(c, 0, 0, sd * 34, 0, 'rgba(255,230,160,.7)', 'rgba(120,200,255,0)'); c.beginPath(); c.ellipse(sd * 18, 0, 20, 7, 0, 0, TAU); c.fill(); c.restore(); }
      c.globalCompositeOperation = 'source-over';
    } else { // あほ毛と星の髪飾り
      c.strokeStyle = mix(s.hair[1], '#000000', .3); c.fillStyle = s.hair[0]; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(-1, -26); c.quadraticCurveTo(6, -40, 12 + Math.sin(t * .08) * 1.5, -33); c.quadraticCurveTo(5, -34, 2, -26); c.closePath(); c.fill(); c.stroke();
      c.save(); c.translate(15, -16); c.rotate(.3); c.fillStyle = '#fff6c0'; c.strokeStyle = '#e09a2a'; c.lineWidth = 1; starPath(c, 6.5, 2.9); c.fill(); c.stroke(); c.restore();
    }
  } else if (id === 'clem') {
    if (where === 'back') { // 背中のゼンマイ
      c.save(); c.translate(0, 36); c.rotate(t * .05); c.strokeStyle = '#ffd98a'; c.lineWidth = 3;
      for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 30, 0, 9, 6, 0, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(-22, 0); c.lineTo(22, 0); c.stroke(); c.restore();
    } else { // 歯車のヘッドドレスと赤いリボン
      c.save(); c.translate(0, -24); gearPath(c, 8, 9, t * .03, .26); c.fillStyle = '#ffd98a'; c.fill(); c.strokeStyle = '#a8651f'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(0, 0, 3, 0, TAU); c.fill(); c.stroke(); c.restore();
      c.fillStyle = s.ribbon; c.strokeStyle = mix(s.ribbon, '#000000', .4); c.lineWidth = 1;
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 21, -10); c.lineTo(sd * 30, -17); c.lineTo(sd * 30, -4); c.closePath(); c.fill(); c.stroke(); }
    }
  } else if (id === 'lumi') {
    if (where === 'back') { // 肩にかけた光の織物
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const g = c.createLinearGradient(-60, 0, 60, 0); g.addColorStop(0, 'rgba(110,255,190,0)'); g.addColorStop(.3, 'rgba(110,255,190,.5)'); g.addColorStop(.6, 'rgba(100,200,255,.5)'); g.addColorStop(1, 'rgba(255,130,220,0)');
        c.strokeStyle = g; c.lineWidth = 7 - k * 1.6; c.beginPath();
        for (let x = -60; x <= 60; x += 6) { const y = 22 + k * 9 + Math.sin(x * .06 + t * .05 + k) * (8 + k * 2) - Math.cos(x * .026) * 16; x === -60 ? c.moveTo(x, y) : c.lineTo(x, y); }
        c.stroke();
      }
      c.globalCompositeOperation = 'source-over';
    } else { // 耳あてと雪の結晶
      c.strokeStyle = '#e8fff8'; c.lineWidth = 3; c.beginPath(); c.arc(0, -3, 23.5, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
      c.fillStyle = '#ffffff'; c.strokeStyle = '#8fe6d0'; c.lineWidth = 1.2;
      for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * 23, 3, 7, 0, TAU); c.fill(); c.stroke(); }
      c.save(); c.translate(-13, -19); c.rotate(t * .01); c.strokeStyle = '#7ff0d0'; c.lineWidth = 1.4; for (let i = 0; i < 3; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke(); } c.restore();
    }
  } else if (id === 'maris') {
    if (where === 'back') { // 潮を測る輪
      c.strokeStyle = 'rgba(120,220,255,.75)'; c.lineWidth = 1.6;
      for (let k = 0; k < 2; k++) { c.beginPath(); c.ellipse(0, 40 + k * 4, 44 + k * 8, 12 + k * 3, Math.sin(t * .02 + k) * .12, 0, TAU); c.stroke(); }
      c.fillStyle = '#e8f6ff'; for (let k = 0; k < 4; k++) { const a = t * .03 + k * TAU / 4; c.beginPath(); c.arc(Math.cos(a) * 44, 40 + Math.sin(a) * 12, 2.4, 0, TAU); c.fill(); }
    } else { // 水兵帽
      c.fillStyle = '#f4fbff'; c.strokeStyle = '#1c2f7a'; c.lineWidth = 1.3;
      c.beginPath(); c.ellipse(1, -25, 19, 8, -.08, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#1c2f7a'; c.beginPath(); c.ellipse(1, -20.5, 15, 3.4, -.08, 0, TAU); c.fill();
      c.fillStyle = '#58e0ff'; c.beginPath(); c.arc(-9, -24, 2.6, 0, TAU); c.fill();
    }
  } else if (id === 'halley') {
    if (where === 'back') { // 羽根ペンの翼
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
        c.save(); c.translate(sd * 14, 32); c.rotate(sd * (-.5 + k * .42 + Math.sin(t * .06 + k) * .06));
        c.fillStyle = lin(c, 0, 0, sd * 44, 0, '#ffffff', '#a8c8ff'); c.strokeStyle = 'rgba(60,90,160,.7)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(sd * 24, -9, sd * 46, 0); c.quadraticCurveTo(sd * 24, 7, 0, 0); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(0, 0); c.lineTo(sd * 46, 0); c.stroke(); c.restore();
      }
    } else { // 配達帽と丸めがね
      c.fillStyle = '#28407a'; c.strokeStyle = '#0c1630'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-18, -18); c.quadraticCurveTo(-18, -36, 0, -36); c.quadraticCurveTo(18, -36, 18, -18); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#16264e'; c.beginPath(); c.ellipse(4, -17.5, 21, 4, .05, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#ffe08a'; c.save(); c.translate(0, -27); starPath(c, 4.6, 2); c.fill(); c.restore();
      c.strokeStyle = 'rgba(255,224,138,.95)'; c.lineWidth = 1.2;
      for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * 9.4, 3.4, 8.2, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(-1.2, 2.5); c.lineTo(1.2, 2.5); c.stroke();
    }
  } else if (id === 'nox') {
    if (where === 'back') { // 頭の後ろの黒い太陽
      c.save(); c.translate(0, -4);
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + t * .006, L = 44 + 10 * Math.sin(t * .05 + i * 2.1); c.strokeStyle = `rgba(255,${120 + (i % 3) * 30},130,.42)`; c.lineWidth = 2.4; c.beginPath(); c.moveTo(Math.cos(a) * 33, Math.sin(a) * 33); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.stroke(); }
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#0a0410'; c.beginPath(); c.arc(0, 0, 33, 0, TAU); c.fill();
      c.strokeStyle = '#ffd8c0'; c.lineWidth = 1.6; c.stroke(); c.restore();
    } else { // ティアラ
      c.fillStyle = '#ffd08a'; c.strokeStyle = '#8a4a20'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-13, -19); c.lineTo(-9, -29); c.lineTo(-5, -21); c.lineTo(0, -33); c.lineTo(5, -21); c.lineTo(9, -29); c.lineTo(13, -19); c.quadraticCurveTo(0, -23, -13, -19); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff3a6a'; c.beginPath(); c.arc(0, -24, 2.3, 0, TAU); c.fill();
    }
  } else if (id === 'selene') {
    if (where === 'back') { // 天球儀の輪
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = k === 1 ? 'rgba(255,215,140,.9)' : 'rgba(210,225,255,.9)'; c.lineWidth = 1.6;
        c.beginPath(); c.ellipse(0, 30, 50, 50 * Math.abs(Math.cos(t * .02 + k * 1.1)) + 3, k * 1.05, 0, TAU); c.stroke();
      }
    } else { // 三日月の冠
      c.save(); c.translate(0, -27); c.fillStyle = '#fff4c9'; c.strokeStyle = '#b08a3a'; c.lineWidth = 1;
      c.beginPath(); c.arc(0, 0, 8, Math.PI * .1, Math.PI * .9, true); c.arc(0, -4, 7, Math.PI * .86, Math.PI * .14, false); c.closePath(); c.fill(); c.stroke(); c.restore();
      c.fillStyle = '#fff4c9'; for (const sd of [-1, 1]) { c.save(); c.translate(sd * 14, -20); starPath(c, 2.6, 1.1); c.fill(); c.restore(); }
    }
  }
}

// 全身を描く。(x, y) は顔の中心、scale 1 で頭の半径が約 22
export function drawCharacter(c, id, x, y, scale, {expr = 'normal', t = 0, lean = 0, bust = false} = {}) {
  const s = CAST[id]; if (!s) return;
  c.save(); c.translate(x, y); c.scale(scale, scale); c.rotate(lean); c.lineJoin = 'round';
  extras(c, id, 'back', t);
  backHair(c, s, t);
  if (!bust) body(c, s, t);
  else { c.save(); c.beginPath(); c.rect(-70, -70, 140, 132); c.clip(); body(c, s, t); c.restore(); }
  face(c, s, expr, t);
  frontHair(c, s, t);
  extras(c, id, 'front', t);
  c.restore();
}
