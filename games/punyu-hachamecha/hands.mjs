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
