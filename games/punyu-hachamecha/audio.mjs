// 効果音とBGM（Web Audio で合成。音声ファイルは使わない）
export class Sound {
  constructor(on = true) { this.on = on; this.ctx = null; this.bgmTimer = null; this.step = 0; }

  // iOS では画面タッチの中で呼ぶ必要がある
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.5 : 0; this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.music = this.ctx.createGain(); this.music.gain.value = 0.16; this.music.connect(this.master);
      const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0);
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }

  setOn(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.02); }

  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, at = 0, dest = null, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.02);
  }

  play(type) {
    if (!this.ctx || !this.on) return;
    switch (type) {
      case 'tap': this.tone(660, 0.08, { type: 'triangle', vol: 0.18 }); break;
      case 'step': this.tone(300 + Math.random() * 60, 0.05, { type: 'sine', vol: 0.05 }); break;
      case 'pop': this.tone(520, 0.14, { type: 'sine', vol: 0.25, slide: 2.2 }); break;
      case 'get': [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.16, { type: 'sine', vol: 0.14, at: i * 0.05 })); break;
      case 'win': [784, 988].forEach((f, i) => this.tone(f, 0.14, { type: 'triangle', vol: 0.2, at: i * 0.09 })); break;
      case 'draw': this.tone(587, 0.15, { type: 'triangle', vol: 0.15 }); break;
      case 'lose': this.tone(392, 0.18, { type: 'triangle', vol: 0.13, slide: 0.8 }); break;
      case 'fanfare': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.2, at: i * 0.12 })); break;
      case 'kira': { const n = [1568, 1760, 2093][Math.floor(Math.random() * 3)]; this.tone(n, 0.15, { type: 'sine', vol: 0.1 }); break; }
    }
  }

  // かんたんな BGM（8おんぷの ゆるい ループ）
  startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    const notes = [523, 587, 659, 784, 659, 587, 523, 392, 440, 523, 587, 659, 587, 523, 440, 392];
    const beat = () => {
      if (!this.on) return;
      const f = notes[this.step % notes.length];
      this.tone(f, 0.34, { type: 'triangle', vol: 0.16, dest: this.music });
      if (this.step % 4 === 0) this.tone(f / 2, 0.6, { type: 'sine', vol: 0.12, dest: this.music });
      this.step += 1;
    };
    beat();
    this.bgmTimer = setInterval(beat, 340);
  }

  stopBgm() { if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; } }
}
