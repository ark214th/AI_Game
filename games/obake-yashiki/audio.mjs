// こうかおん（Web Audio で その場で つくる）
let ac = null;

export function unlockAudio() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.resume) ac.resume();
  } catch { ac = null; }
}

function tone(f, d, type = 'sine', vol = 0.12, slide = 0, delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
  gn.gain.setValueAtTime(vol, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn).connect(ac.destination);
  o.start(t); o.stop(t + d + 0.02);
}

export const sfx = {
  pick: () => tone(620, 0.09, 'triangle', 0.14, 900),
  place: () => tone(880, 0.12, 'triangle', 0.13),
  nope: () => { tone(220, 0.12, 'square', 0.05); tone(180, 0.15, 'square', 0.05, 0, 0.1); },
  row: () => [660, 830, 990, 1320].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, 0, i * 0.08)),
  ghost: () => tone(420, 0.9, 'sine', 0.08, 160),
  boo: () => { tone(140, 0.4, 'sawtooth', 0.09, 70); tone(95, 0.5, 'square', 0.06, 60, 0.05); },
  flee: () => tone(300, 0.5, 'sine', 0.1, 1400),
  clear: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, 0, i * 0.12)),
};
