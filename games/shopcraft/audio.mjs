// 音は すべて Web Audio で つくる（音声ファイルは 使わない）。
export class Sound {
  constructor(on = true, music = true) {
    this.on = on;
    this.musicOn = music;
    this.ctx = null;
    this.nextNote = 0;
    this.chord = 0;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.22;
    this.musicGain.connect(this.master);
    const n = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, n, n);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  get ready() { return this.ctx && this.on; }

  tone(freq, dur, {type = 'sine', vol = 0.25, at = 0, attack = 0.005, out = null, slide = 0} = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, {freq = 800, q = 1, vol = 0.3, type = 'bandpass', at = 0} = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  place() { if (!this.ready) return; this.noise(0.09, {freq: 420, q: 0.8, vol: 0.5, type: 'lowpass'}); this.tone(140, 0.08, {vol: 0.18, type: 'triangle'}); }
  break() { if (!this.ready) return; this.noise(0.16, {freq: 1300, q: 0.7, vol: 0.4}); this.noise(0.12, {freq: 500, q: 1, vol: 0.3, at: 0.04}); }
  tap() { if (!this.ready) return; this.tone(880, 0.06, {vol: 0.08, type: 'triangle'}); }
  coin() {
    if (!this.ready) return;
    this.tone(1318.5, 0.12, {vol: 0.16, type: 'square'});
    this.tone(1975.5, 0.35, {vol: 0.14, type: 'square', at: 0.07});
  }
  bell() {
    if (!this.ready) return;
    for (const [f, at] of [[1568, 0], [1318.5, 0.11], [1568, 0.3]]) this.tone(f, 0.5, {vol: 0.09, at, type: 'sine'});
  }
  pop() { if (!this.ready) return; this.tone(600, 0.1, {vol: 0.1, slide: 1.8, type: 'sine'}); }
  sad() { if (!this.ready) return; this.tone(392, 0.18, {vol: 0.08, type: 'triangle'}); this.tone(330, 0.3, {vol: 0.08, type: 'triangle', at: 0.16}); }
  buy() { if (!this.ready) return; [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, {vol: 0.12, type: 'square', at: i * 0.07})); }
  fanfare() {
    if (!this.ready) return;
    [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36], [784, 0.52], [1046, 0.64]].forEach(([f, at]) => this.tone(f, 0.3, {vol: 0.14, type: 'square', at}));
    [[262, 0], [392, 0.36]].forEach(([f, at]) => this.tone(f, 0.5, {vol: 0.12, type: 'triangle', at}));
  }
  gift() { if (!this.ready) return; [1046, 1318, 1568, 2093, 1568, 2093].forEach((f, i) => this.tone(f, 0.25, {vol: 0.08, at: i * 0.08, type: 'sine'})); }

  // しずかな BGM：ピアノふうの 音を ときどき ならす
  music(dt) {
    if (!this.ready || !this.musicOn) return;
    const t = this.ctx.currentTime;
    if (t < this.nextNote) return;
    const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]];
    const ch = chords[this.chord % chords.length];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    if (Math.random() < 0.35) {
      this.tone(mtof(ch[0] - 12), 3.2, {vol: 0.18, type: 'sine', attack: 0.02, out: this.musicGain});
      this.chord++;
    }
    const n = 1 + (Math.random() < 0.4 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const m = ch[Math.floor(Math.random() * ch.length)] + (Math.random() < 0.5 ? 12 : 0);
      this.tone(mtof(m), 2.4, {vol: 0.16, type: 'triangle', attack: 0.01, at: k * 0.28, out: this.musicGain});
    }
    this.nextNote = t + 1.2 + Math.random() * 2.2;
    void dt;
  }
}
