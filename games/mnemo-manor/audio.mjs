// 効果音（Web Audio で合成。音声ファイルは使わない）。
// 閃光の最中は音を鳴らさない：音が「いつ光るか」の手がかりになるため。

let ac = null;
let master = null;
let enabled = true;

export function setSound(on) {
  enabled = on;
  if (master) master.gain.value = on ? 0.5 : 0;
}

export function unlockAudio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = enabled ? 0.5 : 0;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}

function tone(freq, { at = 0, dur = 0.25, type = 'sine', vol = 0.3, slide = 0 } = {}) {
  if (!ac || !enabled) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise({ at = 0, dur = 0.2, vol = 0.25, freq = 800, q = 1 } = {}) {
  if (!ac || !enabled) return;
  const t = ac.currentTime + at;
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

// 成功：コンボが続くほど音程が上がる
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
export function sfxSuccess(combo) {
  const base = 523.25;
  const step = SCALE[Math.min(SCALE.length - 1, Math.max(0, combo - 1))];
  const f = base * Math.pow(2, step / 12);
  tone(f, { dur: 0.35, type: 'triangle', vol: 0.28 });
  tone(f * 1.5, { at: 0.06, dur: 0.4, type: 'sine', vol: 0.16 });
  tone(f * 2, { at: 0.12, dur: 0.5, type: 'sine', vol: 0.1 });
}

export function sfxTrap() {
  tone(140, { dur: 0.35, type: 'sawtooth', vol: 0.2, slide: 0.5 });
  noise({ dur: 0.3, vol: 0.3, freq: 300 });
}

export function sfxMimic() {
  for (let i = 0; i < 3; i++) noise({ at: 0.12 + i * 0.1, dur: 0.05, vol: 0.35, freq: 2400, q: 4 });
}

export function sfxOil() {
  tone(880, { dur: 0.2, type: 'sine', vol: 0.2 });
  tone(1320, { at: 0.08, dur: 0.3, type: 'sine', vol: 0.15 });
}

export function sfxStage(up) {
  const seq = up ? [392, 523.25, 659.25, 783.99] : [392, 329.63];
  seq.forEach((f, i) => tone(f, { at: i * 0.1, dur: 0.4, type: 'triangle', vol: 0.2 }));
}

export function sfxTap() {
  tone(660, { dur: 0.06, type: 'square', vol: 0.05 });
}

export function sfxEnd() {
  [523.25, 392, 440, 523.25].forEach((f, i) => tone(f, { at: i * 0.16, dur: 0.5, type: 'triangle', vol: 0.18 }));
}

// 館に品物を置いた：ぽよんと変な音（毎回少しずつ音程を変える）
export function sfxPlace() {
  const f = 300 + Math.random() * 300;
  tone(f, { dur: 0.25, type: 'sine', vol: 0.25, slide: 2.2 });
  tone(f * 1.5, { at: 0.12, dur: 0.3, type: 'triangle', vol: 0.12, slide: 0.6 });
}

export function sfxAltar() {
  tone(196, { dur: 1.2, type: 'sine', vol: 0.12 });
  tone(293.66, { at: 0.05, dur: 1.2, type: 'sine', vol: 0.08 });
}

// 祭壇で思い出せた
export function sfxRecall() {
  [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.5, type: 'triangle', vol: 0.18 }));
}
