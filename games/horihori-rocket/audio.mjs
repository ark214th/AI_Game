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
      this.music = this.ctx.createGain(); this.music.gain.value = 0.16; this.music.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
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

  hiss(dur, freq, vol, at = 0, q = 1.2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; s.loop = dur > 0.45; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t); s.stop(t + dur + 0.02);
  }

  // みじかい あいだに なんども ならさない
  play(type, gap = 0, arg = 0) {
    if (!this.ctx || !this.on) return;
    const now = this.ctx.currentTime;
    if (gap && this.last[type] && now - this.last[type] < gap) return;
    this.last[type] = now;
    const R = Math.random;
    switch (type) {
      case 'tap': this.tone(740, 0.07, { vol: 0.14 }); break;
      case 'drill': this.hiss(0.09, 300 + R() * 200, 0.12); this.tone(90 + R() * 30, 0.08, { type: 'square', vol: 0.04 }); break;
      case 'break': this.hiss(0.16, 500, 0.18); this.tone(140, 0.12, { type: 'triangle', vol: 0.12, slide: 0.5 }); break;
      case 'ore': this.tone(880 + arg * 90, 0.12, { type: 'triangle', vol: 0.16, slide: 1.4 }); this.tone(1320 + arg * 120, 0.1, { vol: 0.06, at: 0.05 }); break;
      case 'clank': this.tone(220, 0.15, { type: 'square', vol: 0.07, slide: 0.8 }); this.tone(330, 0.1, { type: 'square', vol: 0.05, at: 0.05 }); break;
      case 'coin': this.tone(1568, 0.07, { type: 'square', vol: 0.06 }); this.tone(2093, 0.16, { type: 'square', vol: 0.06, at: 0.06 }); break;
      case 'drop': this.tone(520 + R() * 80, 0.06, { type: 'triangle', vol: 0.09, slide: 0.7 }); break;
      case 'jet': this.hiss(0.14, 900, 0.05, 0, 0.6); break;
      case 'place': this.tone(400, 0.08, { type: 'triangle', vol: 0.14 }); this.tone(600, 0.08, { type: 'triangle', vol: 0.1, at: 0.04 }); break;
      case 'remove': this.tone(500, 0.1, { type: 'triangle', vol: 0.12, slide: 0.6 }); break;
      case 'buy': [659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.18, at: i * 0.07 })); break;
      case 'no': this.tone(300, 0.12, { type: 'triangle', vol: 0.12 }); this.tone(240, 0.16, { type: 'triangle', vol: 0.12, at: 0.1 }); break;
      case 'fossil': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.16, at: i * 0.08 })); break;
      case 'treasure': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, i === 6 ? 0.8 : 0.2, { type: 'triangle', vol: 0.2, at: i * 0.11 })); break;
      case 'warp': for (let i = 0; i < 12; i++) this.tone(300 * Math.pow(2, i / 6), 0.18, { vol: 0.08, at: i * 0.04 }); break;
      case 'low': this.tone(660, 0.12, { type: 'square', vol: 0.05 }); this.tone(660, 0.12, { type: 'square', vol: 0.05, at: 0.2 }); break;
      case 'rumble': this.hiss(arg || 3, 120, 0.35, 0, 0.5); this.tone(55, arg || 3, { type: 'sawtooth', vol: 0.08, attack: 0.3 }); break;
      case 'fanfare': [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.5], [988, 0.7], [1047, 0.85], [1319, 1.05]].forEach(([f, a], i) => { this.tone(f, i === 6 ? 1.2 : 0.22, { type: 'triangle', vol: 0.2, at: a }); this.tone(f / 2, 0.22, { vol: 0.1, at: a }); }); break;
    }
  }

  // ---------- BGM：のんびり 作業の きょく ----------
  startBgm() {
    if (!this.ctx || this.bgmOn) return;
    this.bgmOn = true;
    this.nextNote = this.ctx.currentTime + 0.1; this.step = 0;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 60);
  }
  stopBgm() { this.bgmOn = false; }

  schedule() {
    if (!this.bgmOn || !this.ctx || this.ctx.state !== 'running') return;
    const spb = 60 / 116 / 2;
    const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
    while (this.nextNote < this.ctx.currentTime + 0.3) {
      const at = this.nextNote - this.ctx.currentTime;
      const i = this.step % MEL.length, chord = CHORDS[Math.floor(i / 8) % CHORDS.length];
      const m = MEL[i];
      if (m) this.tone(mtof(m), spb * 1.8, { type: 'triangle', vol: 0.14, at, dest: this.music });
      if (i % 4 === 0) this.tone(mtof(chord[0]), spb * 3, { type: 'triangle', vol: 0.16, at, dest: this.music, attack: 0.02 });
      if (i % 4 === 2) chord.slice(1).forEach(n => this.tone(mtof(n), spb * 1.2, { type: 'sine', vol: 0.05, at, dest: this.music }));
      this.nextNote += spb; this.step++;
    }
  }
}

// C だいちょう の かるい メロディ
const MEL = [
  72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 74, 76, 0, 0, 0, 0,
  69, 0, 72, 76, 0, 74, 72, 0, 71, 0, 72, 74, 0, 0, 0, 0,
  72, 0, 76, 79, 0, 81, 79, 0, 77, 0, 76, 74, 0, 72, 0, 0,
  74, 0, 76, 74, 0, 71, 67, 0, 72, 0, 0, 0, 0, 0, 0, 0,
];
const CHORDS = [[48, 64, 67], [45, 64, 69], [41, 65, 69], [43, 62, 67], [48, 64, 67], [41, 65, 69], [43, 62, 65], [48, 64, 67]];
