// こうかおん と BGM（Web Audio で 作る。音の ファイルは つかわない）
export class Sound {
  constructor(on = true) { this.on = on; this.ctx = null; this.last = {}; this.mode = null; this.step = 0; this.nextNote = 0; }

  // iOS では がめんを さわった ときに よぶ
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.5 : 0; this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.music = this.ctx.createGain(); this.music.gain.value = 0.2; this.music.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }
  setOn(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.02); }

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
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t); s.stop(t + dur + 0.02);
  }

  // みじかい あいだに 何ども ならさない
  play(type, gap = 0) {
    if (!this.ctx || !this.on) return;
    const now = this.ctx.currentTime;
    if (gap && this.last[type] && now - this.last[type] < gap) return;
    this.last[type] = now;
    const R = Math.random, T = (...a) => this.tone(...a);
    switch (type) {
      case 'tap': T(700, 0.06, { vol: 0.12 }); break;
      case 'no': T(180, 0.12, { type: 'square', vol: 0.06 }); break;
      case 'arrow': this.hiss(0.06, 2400 + R() * 800, 0.05, 0, 3); break;
      case 'cannon': this.hiss(0.12, 240, 0.2); T(110, 0.14, { type: 'triangle', vol: 0.18, slide: 0.5 }); break;
      case 'boom': this.hiss(0.22, 160, 0.26, 0, 0.7); T(70, 0.2, { type: 'sine', vol: 0.22, slide: 0.5 }); break;
      case 'magic': T(900 + R() * 200, 0.12, { type: 'triangle', vol: 0.09, slide: 1.8 }); break;
      case 'zap': T(1400, 0.08, { type: 'sawtooth', vol: 0.05, slide: 0.4 }); this.hiss(0.07, 3000, 0.05, 0, 2); break;
      case 'ice': T(1800, 0.14, { type: 'sine', vol: 0.05, slide: 0.7 }); T(2400, 0.1, { vol: 0.03, at: 0.03 }); break;
      case 'flame': this.hiss(0.2, 700, 0.06, 0, 0.5); break;
      case 'slash': this.hiss(0.07, 1800, 0.07, 0, 1.5); break;
      case 'pop': T(420 + R() * 160, 0.07, { type: 'triangle', vol: 0.1, slide: 1.6 }); break;
      case 'coin': T(1568, 0.06, { type: 'square', vol: 0.04 }); T(2093, 0.12, { type: 'square', vol: 0.04, at: 0.05 }); break;
      case 'place': T(330, 0.08, { type: 'triangle', vol: 0.16 }); T(495, 0.1, { type: 'triangle', vol: 0.14, at: 0.05 }); break;
      case 'sell': T(660, 0.08, { type: 'triangle', vol: 0.12, slide: 0.6 }); this.play('coin'); break;
      case 'upgrade': [523, 659, 784].forEach((f, i) => T(f, 0.12, { type: 'triangle', vol: 0.14, at: i * 0.06 })); break;
      case 'evolve': [523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 0.2, { type: 'triangle', vol: 0.15, at: i * 0.07 })); this.hiss(0.5, 4000, 0.04, 0.1, 0.8); break;
      case 'buy': [784, 988, 1175, 1568].forEach((f, i) => T(f, 0.16, { type: 'square', vol: 0.05, at: i * 0.06 })); break;
      case 'leak': T(200, 0.3, { type: 'sawtooth', vol: 0.12, slide: 0.5 }); break;
      case 'wave': [392, 392, 523].forEach((f, i) => T(f, i === 2 ? 0.4 : 0.12, { type: 'sawtooth', vol: 0.07, at: i * 0.14 })); break;
      case 'bossIn': [110, 104, 98].forEach((f, i) => T(f, 0.4, { type: 'sawtooth', vol: 0.14, at: i * 0.3 })); break;
      case 'bossDie': this.play('boom'); [392, 523, 659, 784, 1047].forEach((f, i) => T(f, 0.25, { type: 'triangle', vol: 0.14, at: 0.1 + i * 0.08 })); break;
      case 'clear': [523, 659, 784].forEach((f, i) => T(f, 0.18, { type: 'triangle', vol: 0.13, at: i * 0.09 })); break;
      case 'win': [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => T(f, i === 7 ? 0.7 : 0.16, { type: 'square', vol: 0.07, at: i * 0.15 })); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => T(f, 0.35, { type: 'triangle', vol: 0.14, at: i * 0.25 })); break;
      case 'skill': T(300, 0.5, { type: 'sawtooth', vol: 0.1, slide: 4 }); this.hiss(0.5, 1200, 0.1, 0, 0.6); break;
      case 'meteor': T(1200, 0.3, { type: 'sawtooth', vol: 0.08, slide: 0.2 }); this.hiss(0.5, 200, 0.3, 0.25, 0.6); T(60, 0.4, { vol: 0.25, at: 0.25, slide: 0.5 }); break;
      case 'down': T(300, 0.3, { type: 'triangle', vol: 0.12, slide: 0.4 }); break;
      case 'gem': T(1319 + R() * 300, 0.09, { type: 'triangle', vol: 0.08, slide: 1.3 }); break;
    }
  }

  // BGM：'town'（のんびり）か 'battle'（いさましい）。まい フレーム よぶ
  setMusic(mode) { if (this.mode !== mode) { this.mode = mode; this.step = 0; this.nextNote = 0; } }
  tick() {
    if (!this.ctx || !this.mode || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (this.nextNote < now) this.nextNote = now + 0.05;
    const battle = this.mode === 'battle', beat = battle ? 0.21 : 0.3;
    const mel = battle
      ? [220, 0, 262, 294, 330, 0, 294, 262, 247, 0, 294, 330, 392, 0, 330, 294, 220, 0, 262, 294, 330, 0, 392, 440, 392, 330, 294, 262, 247, 0, 196, 0]
      : [392, 0, 494, 587, 0, 494, 440, 0, 392, 0, 440, 494, 0, 392, 330, 0, 349, 0, 440, 523, 0, 440, 392, 0, 294, 0, 392, 494, 440, 0, 392, 0];
    const bass = battle ? [110, 110, 98, 98, 110, 110, 123, 98] : [98, 98, 82, 82, 87, 87, 73, 98];
    while (this.nextNote < now + 0.25) {
      const i = this.step % mel.length, at = this.nextNote - now, f = mel[i];
      if (f) this.tone(f, beat * 1.6, { type: battle ? 'square' : 'triangle', vol: battle ? 0.1 : 0.2, at, dest: this.music, attack: 0.01 });
      if (i % 4 === 0) this.tone(bass[(i / 4) % bass.length], beat * 3.4, { type: 'triangle', vol: 0.3, at, dest: this.music, attack: 0.02 });
      if (battle && i % 2 === 0) this.tone(i % 8 === 4 ? 180 : 70, 0.07, { type: 'sine', vol: 0.3, at, dest: this.music, slide: 0.5 });
      this.step++; this.nextNote += beat;
    }
  }
}
