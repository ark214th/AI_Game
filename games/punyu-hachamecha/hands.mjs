// じゃんけんの て の え（えもじを つかわず、ずけいで かく）。カニは あかい はさみいろ、ぷにゅは しろピンク
const COLORS = {
  kani: { fill: '#ff8f6b', line: '#c9452f' },
  punyu: { fill: '#fff4f7', line: '#e58aa8' },
};

function finger(g, x0, y0, x1, y1, c, w = 22) {
  g.lineCap = 'round';
  g.strokeStyle = c.line; g.lineWidth = w + 9; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = c.fill; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
}
function blob(g, x, y, rx, ry, c) {
  g.fillStyle = c.fill; g.strokeStyle = c.line; g.lineWidth = 5;
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.stroke();
}

// kind: 'gu' | 'choki' | 'pa'、who: 'kani' | 'punyu'。128×128 の キャンバスを かえす
export function handCanvas(kind, who = 'punyu', size = 128) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d'); g.scale(size / 128, size / 128);
  const c = COLORS[who];
  if (kind === 'gu') {
    blob(g, 64, 70, 42, 38, c);
    g.strokeStyle = c.line; g.lineWidth = 4; g.lineCap = 'round';
    for (const x of [44, 64, 84]) { g.beginPath(); g.moveTo(x, 44); g.quadraticCurveTo(x + 3, 56, x, 64); g.stroke(); }
    blob(g, 30, 82, 13, 16, c);
  } else if (kind === 'choki') {
    finger(g, 54, 78, 36, 24, c); finger(g, 74, 78, 92, 24, c);
    blob(g, 64, 88, 32, 28, c);
    blob(g, 40, 96, 12, 14, c);
  } else {
    for (const [x, y] of [[20, 62], [36, 24], [64, 14], [92, 24], [108, 62]]) finger(g, 64, 84, x, y, c, 18);
    blob(g, 64, 88, 30, 27, c);
  }
  return cv;
}

// ゼリーに のせる かざりの え（ボタンと ちゅうもんの ふきだしに つかう）
export function toppingCanvas(kind, size = 128) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d'); g.scale(size / 128, size / 128); g.lineJoin = 'round'; g.lineCap = 'round';
  const shape = (fill, line, draw) => { g.fillStyle = fill; g.strokeStyle = line; g.lineWidth = 5; g.beginPath(); draw(); g.fill(); g.stroke(); };
  if (kind === 'cream') {
    for (const [y, rx, ry] of [[92, 44, 20], [66, 32, 18], [44, 20, 15]]) shape('#ffffff', '#e7b7cf', () => g.ellipse(64, y, rx, ry, 0, 0, Math.PI * 2));
    shape('#ffffff', '#e7b7cf', () => { g.moveTo(54, 36); g.quadraticCurveTo(66, 4, 72, 34); });
  } else if (kind === 'ichigo') {
    shape('#ff4d6d', '#c92a4b', () => { g.moveTo(28, 44); g.quadraticCurveTo(64, 20, 100, 44); g.quadraticCurveTo(96, 96, 64, 114); g.quadraticCurveTo(32, 96, 28, 44); });
    g.fillStyle = '#fff3a8'; for (const [x, y] of [[48, 60], [80, 60], [64, 78], [50, 88], [78, 88], [64, 52]]) { g.beginPath(); g.ellipse(x, y, 3, 4.5, 0, 0, Math.PI * 2); g.fill(); }
    shape('#5bb34a', '#3d8a30', () => { g.moveTo(40, 40); g.lineTo(54, 22); g.lineTo(64, 36); g.lineTo(74, 22); g.lineTo(88, 40); g.quadraticCurveTo(64, 50, 40, 40); });
  } else if (kind === 'cherry') {
    g.strokeStyle = '#5b8a3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(44, 78); g.quadraticCurveTo(52, 30, 84, 18); g.moveTo(86, 80); g.quadraticCurveTo(88, 44, 84, 18); g.stroke();
    for (const x of [42, 86]) { shape('#e0264f', '#a8183a', () => g.arc(x, 88, 24, 0, Math.PI * 2)); g.fillStyle = '#ffffffaa'; g.beginPath(); g.ellipse(x - 8, 80, 6, 8, 0.5, 0, Math.PI * 2); g.fill(); }
  } else if (kind === 'hoshi') {
    shape('#ffd84a', '#d99a00', () => { for (let i = 0; i < 10; i++) { const r = i % 2 ? 24 : 54, a = (i / 10) * Math.PI * 2 - Math.PI / 2; const x = 64 + Math.cos(a) * r, y = 68 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); });
  } else {
    shape('#8a5a3c', '#5e3a24', () => g.roundRect ? g.roundRect(22, 34, 84, 64, 12) : g.rect(22, 34, 84, 64));
    g.strokeStyle = '#5e3a24'; g.lineWidth = 4; g.beginPath(); g.moveTo(64, 36); g.lineTo(64, 96); g.moveTo(24, 66); g.lineTo(104, 66); g.stroke();
  }
  return cv;
}
