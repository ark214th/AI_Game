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
      this.music = this.ctx.createGain(); this.music.gain.value = 0.22; this.music.connect(this.master);
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

  // みじかい あいだに なんども ならさない
  play(type, gap = 0) {
    if (!this.ctx || !this.on) return;
    const now = this.ctx.currentTime;
    if (gap && this.last[type] && now - this.last[type] < gap) return;
    this.last[type] = now;
    const R = Math.random;
    switch (type) {
      case 'tap': this.tone(660, 0.07, { vol: 0.15 }); break;
      case 'pop': this.tone(500 + R() * 200, 0.1, { type: 'triangle', vol: 0.2, slide: 1.8 }); break;
      case 'drop': this.tone(300, 0.12, { type: 'sine', vol: 0.25, slide: 0.6 }); this.tone(900, 0.08, { vol: 0.08, at: 0.05 }); break;
      case 'pick': this.tone(700, 0.08, { type: 'triangle', vol: 0.15, slide: 1.4 }); break;
      case 'munch': [0, 0.13, 0.26].forEach(a => this.tone(180 + R() * 60, 0.07, { type: 'square', vol: 0.06, slide: 0.6, at: a })); break;
      case 'fav': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.18, at: 0.3 + i * 0.07 })); break;
      case 'ok': [659, 880].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.16, at: 0.3 + i * 0.08 })); break;
      case 'yuck': this.tone(420, 0.35, { type: 'triangle', vol: 0.22, slide: 0.45 }); this.tone(200, 0.2, { type: 'square', vol: 0.05, at: 0.1, slide: 0.8 }); break;
      case 'no': this.tone(400, 0.1, { type: 'triangle', vol: 0.14 }); this.tone(340, 0.14, { type: 'triangle', vol: 0.14, at: 0.12 }); break;
      case 'scrub': this.tone(900 + R() * 900, 0.06, { type: 'sine', vol: 0.05, slide: 1.6 }); break;
      case 'bubble': this.tone(500 + R() * 700, 0.08, { type: 'sine', vol: 0.09, slide: 2.2 }); break;
      case 'splash': this.tone(1400 + R() * 800, 0.06, { type: 'sine', vol: 0.04, slide: 0.5 }); break;
      case 'shine': [1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.3, { vol: 0.12, at: i * 0.08 })); break;
      case 'pet': this.tone(220 + R() * 40, 0.25, { type: 'sine', vol: 0.12, slide: 1.1 }); break;
      case 'heart': [880, 1175].forEach((f, i) => this.tone(f, 0.16, { vol: 0.14, at: i * 0.06 })); break;
      case 'like': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.18, at: i * 0.07 })); break;
      case 'bell': this.tone(1568, 0.8, { vol: 0.2 }); this.tone(2349, 0.6, { vol: 0.08 }); break;
      case 'door': this.tone(300, 0.2, { type: 'triangle', vol: 0.15, slide: 1.5 }); break;
      case 'unlock': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, i === 6 ? 0.8 : 0.2, { type: 'triangle', vol: 0.22, at: i * 0.11 })); break;
      case 'night': [659, 523, 440, 392].forEach((f, i) => this.tone(f, 0.6, { vol: 0.16, at: i * 0.3 })); break;
      case 'morning': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.18, at: i * 0.12 })); break;
      case 'gift': [784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.25, { vol: 0.15, at: i * 0.07 })); break;
    }
  }

  // ---------- BGM：オルゴールみたいな ゆったりした きょく ----------
  startBgm() {
    if (!this.ctx || this.bgmOn) return;
    this.bgmOn = true;
    this.nextNote = this.ctx.currentTime + 0.1; this.step = 0;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 60);
  }
  stopBgm() { this.bgmOn = false; }

  schedule() {
    if (!this.bgmOn || !this.ctx || this.ctx.state !== 'running') return;
    const spb = 60 / 96 / 2;
    const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
    while (this.nextNote < this.ctx.currentTime + 0.3) {
      const at = this.nextNote - this.ctx.currentTime;
      const i = this.step % MEL.length, chord = CHORDS[Math.floor(i / 16) % CHORDS.length];
      const m = MEL[i];
      if (m) { this.tone(mtof(m), spb * 3, { type: 'sine', vol: 0.18, at, dest: this.music, attack: 0.005 }); this.tone(mtof(m + 12), spb * 1.5, { type: 'sine', vol: 0.04, at, dest: this.music }); }
      if (i % 8 === 0) this.tone(mtof(chord[0]), spb * 7, { type: 'triangle', vol: 0.12, at, dest: this.music, attack: 0.03 });
      if (i % 4 === 2) chord.slice(1).forEach(n => this.tone(mtof(n), spb * 1.8, { type: 'sine', vol: 0.05, at, dest: this.music }));
      this.nextNote += spb; this.step++;
    }
  }
}

const MEL = [
  72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 76, 0, 74, 0, 0, 0,
  71, 0, 74, 0, 77, 0, 74, 0, 76, 0, 74, 0, 72, 0, 0, 0,
  72, 0, 76, 0, 79, 0, 84, 0, 81, 0, 79, 0, 77, 0, 76, 0,
  74, 0, 77, 0, 76, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0,
];
const CHORDS = [[48, 64, 67], [43, 62, 65], [45, 64, 69], [43, 62, 67]];
