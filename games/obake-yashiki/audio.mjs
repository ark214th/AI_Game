// こうかおん（Web Audio で その場で つくる）
let ac = null, noiseBuf = null;

export function unlockAudio() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended' && ac.resume) ac.resume();
  } catch { ac = null; }
}

function tone(f, d, type = 'sine', vol = 0.12, slide = 0, delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn).connect(ac.destination);
  o.start(t); o.stop(t + d + 0.02);
}

// 紙や 木の 音に つかう ざらざら音
function noise(d, freq, q, vol, delay = 0, type = 'bandpass') {
  if (!ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain();
  src.buffer = noiseBuf;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  gn.gain.setValueAtTime(vol, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(f).connect(gn).connect(ac.destination);
  src.start(t, Math.random() * 0.5); src.stop(t + d + 0.02);
}

export const sfx = {
  step: () => noise(0.08, 380 + Math.random() * 120, 1.2, 0.05),
  pick: () => { noise(0.12, 2400, 0.8, 0.12); tone(520, 0.08, 'triangle', 0.05, 700); },
  place: () => { tone(190 + Math.random() * 30, 0.09, 'triangle', 0.16); noise(0.05, 1500, 1.5, 0.08); },
  nope: () => { tone(260, 0.14, 'sine', 0.08, 200); },
  row: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, 0, i * 0.09)),
  magic: () => { [1200, 1500, 1800, 2400].forEach((f, i) => tone(f, 0.3, 'sine', 0.06, f * 1.3, i * 0.05)); noise(0.5, 3000, 0.5, 0.05); },
  unlock: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, 'triangle', 0.1, 0, i * 0.1)),
  clear: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, 0, i * 0.13)),
};
