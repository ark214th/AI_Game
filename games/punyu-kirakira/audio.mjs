// 効果音とBGM（Web Audio で合成。音声ファイルは使わない）
export class Sound {
  constructor(on = true) { this.on = on; this.ctx = null; this.bgmOn = false; this.nextNote = 0; this.step = 0; }

  // iOS では画面タッチの中で呼ぶ必要がある
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.55 : 0; this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.music = this.ctx.createGain(); this.music.gain.value = 0.28; this.music.connect(this.master);
      // 無音を一度鳴らして iOS の音を有効にする
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

  play(type, e = {}) {
    if (!this.ctx || !this.on) return;
    switch (type) {
      case 'jump': this.tone(420, 0.16, { type: 'triangle', vol: 0.25, slide: 2.1 }); break;
      case 'star': { const n = [1319, 1568, 1760, 2093][Math.floor(Math.random() * 4)]; this.tone(n, 0.18, { type: 'sine', vol: 0.16 }); this.tone(n * 1.5, 0.12, { type: 'sine', vol: 0.06, at: 0.04 }); break; }
      case 'medal': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.22, at: i * 0.08 })); break;
      case 'spring': this.tone(220, 0.35, { type: 'sine', vol: 0.35, slide: 4 }); this.tone(330, 0.3, { type: 'triangle', vol: 0.12, slide: 3, at: 0.02 }); break;
      case 'dash': this.tone(300, 0.3, { type: 'sawtooth', vol: 0.08, slide: 3 }); this.tone(600, 0.25, { type: 'triangle', vol: 0.15, slide: 2, at: 0.05 }); break;
      case 'stomp': this.tone(520, 0.12, { type: 'square', vol: 0.12, slide: 0.5 }); this.tone(880, 0.15, { type: 'triangle', vol: 0.15, at: 0.07 }); break;
      case 'land': if (e.impact > 0.4) this.tone(140, 0.08, { type: 'sine', vol: 0.18, slide: 0.6 }); break;
      case 'hurt': this.tone(500, 0.25, { type: 'triangle', vol: 0.25, slide: 0.5 }); break;
      case 'bubble': this.tone(300, 0.5, { type: 'sine', vol: 0.2, slide: 2.5 }); this.tone(600, 0.3, { type: 'sine', vol: 0.1, slide: 2, at: 0.2 }); break;
      case 'pop': this.tone(900, 0.08, { type: 'sine', vol: 0.2, slide: 0.4 }); break;
      case 'checkpoint': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.2, at: i * 0.07 })); break;
      case 'heart': [659, 880, 1319].forEach((f, i) => this.tone(f, 0.2, { type: 'sine', vol: 0.2, at: i * 0.08 })); break;
      case 'faint': [523, 440, 392, 330].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.18, at: i * 0.14 })); break;
      case 'goal': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, i === 6 ? 0.8 : 0.2, { type: 'triangle', vol: 0.24, at: i * 0.11 })); break;
      case 'tap': this.tone(660, 0.07, { type: 'sine', vol: 0.15 }); break;
    }
  }

  // ---------- BGM：ゆったりした明るいループ ----------
  startBgm() {
    if (!this.ctx) return;
    this.bgmOn = true;
    this.nextNote = this.ctx.currentTime + 0.1; this.step = 0;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 50);
  }
  stopBgm() { this.bgmOn = false; }

  schedule() {
    if (!this.bgmOn || !this.ctx || this.ctx.state !== 'running') return;
    const spb = 60 / 132 / 2; // 8分音符
    // C  G  Am  F の進行
    const chords = [[48, 55, 64], [43, 55, 62], [45, 52, 60], [41, 53, 60]];
    const melody = [
      76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 79, 74, 0, 0, 0,
      72, 0, 76, 0, 79, 0, 81, 79, 77, 0, 76, 0, 74, 0, 0, 0,
      76, 0, 79, 0, 84, 0, 83, 81, 79, 0, 76, 0, 77, 79, 81, 0,
      79, 0, 76, 0, 74, 0, 72, 74, 72, 0, 0, 0, 0, 0, 0, 0,
    ];
    const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
    while (this.nextNote < this.ctx.currentTime + 0.25) {
      const at = this.nextNote - this.ctx.currentTime;
      const i = this.step % 64, bar = Math.floor(i / 16) % 4, chord = chords[bar];
      const m = melody[i];
      if (m) this.tone(mtof(m), spb * 1.6, { type: 'triangle', vol: 0.22, at, dest: this.music, attack: 0.01 });
      if (i % 4 === 0) this.tone(mtof(chord[0] - 12 + 12), spb * 3, { type: 'sine', vol: 0.3, at, dest: this.music });
      if (i % 4 === 2) chord.slice(1).forEach(n => this.tone(mtof(n), spb * 1.2, { type: 'sine', vol: 0.07, at, dest: this.music }));
      if (i % 2 === 1) this.tone(4000, 0.03, { type: 'square', vol: 0.012, at, dest: this.music });
      this.nextNote += spb; this.step++;
    }
  }
}
