// 楽曲データ。すべて3/4拍子。1小節＝8分音符6つ。音名・'-'（のばす）・'.'（休む）
// style: box=オルゴール, stage=道中, boss=ボス
const TITLE = [
  ['Dm', 'D5 - E5 F5 A5 -'], ['Bb', 'D6 - - - C6 Bb5'], ['Gm', 'Bb5 - A5 G5 D5 -'], ['A', 'E5 - - - C#5 -'],
  ['Dm', 'D5 - E5 F5 A5 -'], ['Bb', 'F6 - - - D6 Bb5'], ['C', 'C6 - Bb5 A5 G5 -'], ['A', 'A5 - - - - .'],
  ['F', 'C6 - A5 F5 C6 -'], ['C', 'E6 - D6 C6 G5 -'], ['Dm', 'F5 - A5 D6 F6 -'], ['A', 'E6 - C#6 A5 E5 -'],
  ['Bb', 'D6 - F6 - D6 Bb5'], ['Gm', 'G5 - Bb5 D6 G6 -'], ['A', 'E6 - D6 C#6 E6 -'], ['Dm', 'D6 - - - - .'],
];
const FINALE_B = [
  ['Gm', 'G5 Bb5 D6 - G6 -'], ['C', 'E6 - G6 - C6 -'], ['F', 'F6 - A6 - C6 -'], ['Bb', 'D6 - F6 - Bb6 -'],
  ['Gm', 'G6 - F6 - D6 Bb5'], ['A', 'C#6 - E6 - A6 -'], ['Dm', 'F6 - E6 D6 A5 F5'], ['A', 'E5 - C#5 - A4 -'],
];

export const TRACKS = {
  title: {title: '星降る円舞曲 〜 Overture', bpm: 120, style: 'box', bars: TITLE},
  stage1: {title: '真鍮庭園のメヌエット', bpm: 156, style: 'stage', bars: [
    ['Am', 'E5 - A5 - B5 C6'], ['Dm', 'D6 - C6 - A5 -'], ['G', 'B5 - G5 - D5 -'], ['C', 'E5 - G5 - C6 -'],
    ['F', 'A5 - C6 - F6 -'], ['Dm', 'E6 - D6 - A5 -'], ['E', 'B5 - G#5 - E5 -'], ['E', 'G#5 A5 B5 - - .'],
    ['Am', 'C6 - B5 A5 E5 -'], ['Dm', 'F5 - A5 D6 F6 -'], ['G', 'D6 - B5 G5 D6 -'], ['C', 'E6 - D6 C6 G5 -'],
    ['F', 'A5 - C6 F6 E6 D6'], ['E', 'B5 - G#5 B5 E6 -'], ['Am', 'A5 - - - E5 -'], ['Am', 'A5 - - - - .'],
  ]},
  boss1: {title: 'ゼンマイ人形は一拍ずつ踊る', bpm: 176, style: 'boss', bars: [
    ['Em', 'B4 E5 G5 B5 - A5'], ['C', 'G5 - E5 - C5 E5'], ['D', 'F#5 - A5 D6 - C6'], ['B', 'B5 - F#5 - D#5 -'],
    ['Em', 'E5 G5 B5 E6 - D6'], ['C', 'C6 - B5 - G5 -'], ['Am', 'A5 C6 E6 A6 - G6'], ['B7', 'F#6 - D#6 - B5 A5'],
    ['C', 'G5 - E5 G5 C6 -'], ['D', 'A5 - F#5 A5 D6 -'], ['G', 'B5 - D6 G6 - F#6'], ['Em', 'E6 - B5 - G5 -'],
    ['Am', 'C6 - E6 - A6 G6'], ['B', 'F#6 - D#6 - B5 -'], ['Em', 'E6 - - B5 G5 E5'], ['B', 'F#5 - D#5 - B4 -'],
  ]},
  stage2: {title: '薔薇窓に降る光', bpm: 160, style: 'stage', bars: [
    ['Gm', 'D5 - G5 - Bb5 -'], ['Eb', 'Bb5 - G5 - Eb5 G5'], ['Cm', 'C6 - Bb5 - G5 Eb5'], ['D', 'F#5 - A5 - D6 -'],
    ['Gm', 'G5 - Bb5 D6 G6 -'], ['Eb', 'G6 - F6 Eb6 Bb5 -'], ['F', 'A5 - C6 F6 - Eb6'], ['D', 'D6 - - - - .'],
    ['Bb', 'D6 - F6 - Bb5 -'], ['F', 'C6 - A5 - F5 -'], ['Gm', 'Bb5 - D6 - G6 -'], ['Eb', 'G6 - Bb6 - G6 Eb6'],
    ['Cm', 'C6 - Eb6 G6 - F6'], ['D', 'F#6 - D6 - A5 -'], ['Gm', 'G5 - D6 - Bb5 G5'], ['D', 'A5 - F#5 - D5 -'],
  ]},
  boss2: {title: '七色のカテドラル', bpm: 184, style: 'boss', bars: [
    ['Bm', 'F#5 - B5 - D6 C#6'], ['G', 'B5 - G5 - D5 -'], ['D', 'A5 - F#5 A5 D6 -'], ['A', 'C#6 - - E6 - C#6'],
    ['Bm', 'D6 - F#6 - B6 A6'], ['G', 'G6 - D6 - B5 -'], ['Em', 'E6 - G6 - B6 -'], ['F#', 'A#6 - F#6 - C#6 -'],
    ['G', 'B5 D6 G6 - F#6 G6'], ['A', 'E6 - C#6 - A5 -'], ['F#m', 'F#6 - C#6 A5 F#5 -'], ['Bm', 'B5 - D6 - F#6 -'],
    ['Em', 'G6 - E6 - B5 -'], ['F#', 'A#5 - C#6 - F#6 -'], ['Bm', 'B6 - F#6 - D6 -'], ['F#', 'C#6 - A#5 - F#5 -'],
  ]},
  stage3: {title: '大天球儀ノクターン', bpm: 148, style: 'stage', bars: [
    ['Cm', 'G5 - C6 - Eb6 -'], ['Ab', 'C6 - - - Ab5 -'], ['Eb', 'Bb5 - G5 - Eb5 -'], ['Bb', 'D5 - F5 - Bb5 -'],
    ['Cm', 'C6 - Eb6 - G6 -'], ['Ab', 'Ab6 - G6 - Eb6 -'], ['Fm', 'F6 - Ab6 - C6 -'], ['G', 'B5 - D6 - G6 -'],
    ['Ab', 'Eb6 - C6 - Ab5 -'], ['Bb', 'F6 - D6 - Bb5 -'], ['Eb', 'G6 - Eb6 - Bb5 -'], ['Cm', 'C6 - G5 - Eb5 -'],
    ['Fm', 'Ab5 - C6 - F6 -'], ['G', 'G6 - F6 D6 B5 -'], ['Cm', 'C6 - - - G5 -'], ['G', 'B5 - D6 - G6 -'],
  ]},
  boss3: {title: '星降る円舞曲', bpm: 192, style: 'boss', bars: [...TITLE, ...FINALE_B]},
  ending: {title: '星降る円舞曲 〜 Coda', bpm: 108, style: 'box', bars: TITLE},
};

const NOTE = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
export function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
// コード名 → ルートのピッチクラスと構成音（半音）
export function chord(name) {
  const m = /^([A-G])([#b]?)(m?)(7?)$/.exec(name);
  if (!m) return null;
  const root = (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const tones = m[3] ? [0, 3, 7] : [0, 4, 7];
  if (m[4]) tones.push(10);
  return {root, tones};
}
