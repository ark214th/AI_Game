// こうかおん と BGM（Web Audio で つくる。おとの ファイルは つかわない）
export class Sound {
  constructor(on = true) { this.on = on; this.ctx = null; this.bgmOn = false; this.nextNote = 0; this.step = 0; this.last = {}; }

  // iOS では がめんを さわった ときに よぶ
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.55 : 0; this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.music = this.ctx.createGain(); this.music.gain.value = 0.2; this.music.connect(this.master);
      const len = this.ctx.sampleRate * 0.3;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0);
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }

  setOn(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.02); }

  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, at = 0, dest = this.sfx, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }

  hiss(dur, freq, vol, at = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t); s.stop(t + dur + 0.02);
  }

  // みじかい あいだに なんども ならさない
  play(type, gap = 0) {
    if (!this.ctx || !this.on) return;
    const now = this.ctx.currentTime;
    if (gap && this.last[type] && now - this.last[type] < gap) return;
    this.last[type] = now;
    const R = Math.random;
    switch (type) {
      case 'tap': this.tone(740, 0.07, { vol: 0.14 }); break;
      case 'key': this.tone(880 + R() * 200, 0.08, { type: 'triangle', vol: 0.14 }); break;
      case 'del': this.tone(520, 0.1, { type: 'triangle', vol: 0.12, slide: 0.7 }); break;
      case 'pick': this.tone(700, 0.09, { type: 'triangle', vol: 0.16, slide: 1.5 }); break;
      case 'spread': this.hiss(0.09, 900 + R() * 500, 0.05); break;
      case 'squeeze': this.tone(260 + R() * 60, 0.16, { type: 'sine', vol: 0.18, slide: 1.6 }); this.hiss(0.1, 1400, 0.03); break;
      case 'place': this.tone(600 + R() * 300, 0.1, { type: 'triangle', vol: 0.2, slide: 1.8 }); break;
      case 'full': [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.25, { vol: 0.12, at: i * 0.06 })); break;
      case 'undo': this.tone(500, 0.12, { type: 'triangle', vol: 0.12, slide: 0.6 }); break;
      case 'step': [659, 988].forEach((f, i) => this.tone(f, 0.16, { type: 'triangle', vol: 0.15, at: i * 0.07 })); break;
      case 'magic': for (let i = 0; i < 14; i++) this.tone(880 * Math.pow(2, i / 7), 0.3, { vol: 0.08, at: i * 0.06 }); break;
      case 'done': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, i === 4 ? 0.6 : 0.2, { type: 'triangle', vol: 0.18, at: i * 0.09 })); break;
      case 'bell': this.tone(1568, 0.8, { vol: 0.18 }); this.tone(2093, 0.6, { vol: 0.08, at: 0.12 }); break;
      case 'perfect': [784, 988, 1175, 1568, 1175, 1568, 2093].forEach((f, i) => this.tone(f, i === 6 ? 0.7 : 0.18, { type: 'triangle', vol: 0.18, at: i * 0.09 })); break;
      case 'good': [659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.18, at: i * 0.1 })); break;
      case 'heart': this.tone(1175 + R() * 300, 0.12, { vol: 0.1 }); break;
      case 'unlock': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, i === 6 ? 0.8 : 0.2, { type: 'triangle', vol: 0.2, at: i * 0.11 })); break;
      case 'bye': [784, 659].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.13, at: i * 0.12 })); break;
      case 'henshin': for (let i = 0; i < 16; i++) this.tone(392 * Math.pow(2, i / 8), 0.25, { type: 'triangle', vol: 0.09, at: i * 0.07 }); break;
      case 'flash': this.hiss(0.8, 3000, 0.12); [1568, 2093, 2637].forEach(f => this.tone(f, 1.0, { vol: 0.08 })); break;
      case 'fanfare': [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.42], [988, 0.6], [1047, 0.72]].forEach(([f, a], i) => { this.tone(f, i === 5 ? 0.9 : 0.2, { type: 'triangle', vol: 0.2, at: a }); this.tone(f / 2, 0.2, { type: 'sine', vol: 0.1, at: a }); }); break;
    }
  }

  // ---------- BGM：オルゴールみたいな かわいい きょく ----------
  startBgm() {
    if (!this.ctx || this.bgmOn) return;
    this.bgmOn = true;
    this.nextNote = this.ctx.currentTime + 0.1; this.step = 0;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 60);
  }
  stopBgm() { this.bgmOn = false; }

  schedule() {
    if (!this.bgmOn || !this.ctx || this.ctx.state !== 'running') return;
    const spb = 60 / 108 / 2;
    const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
    while (this.nextNote < this.ctx.currentTime + 0.3) {
      const at = this.nextNote - this.ctx.currentTime;
      const i = this.step % MEL.length, chord = CHORDS[Math.floor(i / 8) % CHORDS.length];
      const m = MEL[i];
      if (m) { this.tone(mtof(m), spb * 2.6, { type: 'sine', vol: 0.17, at, dest: this.music }); this.tone(mtof(m + 12), spb * 1.2, { type: 'sine', vol: 0.035, at, dest: this.music }); }
      if (i % 8 === 0) this.tone(mtof(chord[0]), spb * 6, { type: 'triangle', vol: 0.11, at, dest: this.music, attack: 0.03 });
      if (i % 4 === 2) chord.slice(1).forEach(n => this.tone(mtof(n), spb * 1.5, { type: 'sine', vol: 0.045, at, dest: this.music }));
      this.nextNote += spb; this.step++;
    }
  }
}

// F だいちょう の ゆったりした メロディ
const MEL = [
  77, 0, 81, 0, 84, 0, 81, 0, 82, 0, 81, 0, 79, 0, 0, 0,
  76, 0, 79, 0, 82, 0, 79, 0, 81, 0, 79, 0, 77, 0, 0, 0,
  77, 0, 81, 0, 84, 0, 89, 0, 86, 0, 84, 0, 82, 0, 81, 0,
  79, 0, 82, 0, 81, 0, 79, 0, 77, 0, 0, 0, 0, 0, 0, 0,
];
const CHORDS = [[53, 69, 72], [58, 70, 74], [48, 67, 70], [53, 69, 72], [53, 69, 72], [58, 70, 74], [48, 67, 70], [53, 65, 69]];
