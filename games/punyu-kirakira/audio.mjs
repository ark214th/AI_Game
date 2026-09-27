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
      case 'boing': this.tone(180, 0.3, { type: 'sine', vol: 0.3, slide: 3 }); this.tone(360, 0.2, { type: 'triangle', vol: 0.1, slide: 2, at: 0.04 }); break;
      case 'loop': [523, 784, 1047, 1568].forEach((f, i) => this.tone(f, 0.15, { type: 'triangle', vol: 0.16, at: i * 0.09 })); break;
      case 'crumble': this.tone(160, 0.25, { type: 'square', vol: 0.06, slide: 0.5 }); break;
      case 'restore': this.tone(600, 0.12, { type: 'sine', vol: 0.08, slide: 1.5 }); break;
      case 'switch': [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.2, at: i * 0.06 })); break;
      case 'ride': this.tone(500, 0.3, { type: 'sine', vol: 0.18, slide: 1.8 }); break;
      case 'thud': this.tone(90, 0.25, { type: 'sine', vol: 0.35, slide: 0.5 }); break;
      case 'splash': this.tone(1200, 0.08, { type: 'sine', vol: 0.05, slide: 0.5 }); break;
      case 'bossStart': [392, 330, 392, 523].forEach((f, i) => this.tone(f, 0.18, { type: 'square', vol: 0.08, at: i * 0.14 })); break;
      case 'bossHit': this.tone(700, 0.12, { type: 'square', vol: 0.12, slide: 0.6 }); [880, 1175].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.2, at: 0.1 + i * 0.08 })); break;
      case 'bossDown': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.22, at: i * 0.1 })); break;
      case 'goalAppear': [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.25, { type: 'sine', vol: 0.15, at: i * 0.1 })); break;
    }
  }

  // ---------- BGM：ワールドごとに少しずつ雰囲気を変える ----------
  startBgm(track = 'nohara') {
    if (!this.ctx) return;
    this.track = SONGS[track] || SONGS.nohara;
    this.bgmOn = true;
    this.nextNote = this.ctx.currentTime + 0.1; this.step = 0;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 50);
  }
  stopBgm() { this.bgmOn = false; }

  schedule() {
    if (!this.bgmOn || !this.ctx || this.ctx.state !== 'running') return;
    const S = this.track;
    const spb = 60 / S.bpm / 2; // 8分音符
    const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
    const len = S.melody.length;
    while (this.nextNote < this.ctx.currentTime + 0.25) {
      const at = this.nextNote - this.ctx.currentTime;
      const i = this.step % len, bar = Math.floor(i / 16) % S.chords.length, chord = S.chords[bar];
      const m = S.melody[i];
      if (m) this.tone(mtof(m + S.shift), spb * 1.6, { type: S.lead, vol: 0.2, at, dest: this.music, attack: 0.01 });
      if (i % 4 === 0) this.tone(mtof(chord[0] + S.shift), spb * 3, { type: 'sine', vol: 0.3, at, dest: this.music });
      if (i % 4 === 2) chord.slice(1).forEach(n => this.tone(mtof(n + S.shift), spb * 1.2, { type: 'sine', vol: 0.07, at, dest: this.music }));
      if (S.hat && i % 2 === 1) this.tone(4000, 0.03, { type: 'square', vol: 0.012, at, dest: this.music });
      this.nextNote += spb; this.step++;
    }
  }
}

const MEL_A = [
  76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 79, 74, 0, 0, 0,
  72, 0, 76, 0, 79, 0, 81, 79, 77, 0, 76, 0, 74, 0, 0, 0,
  76, 0, 79, 0, 84, 0, 83, 81, 79, 0, 76, 0, 77, 79, 81, 0,
  79, 0, 76, 0, 74, 0, 72, 74, 72, 0, 0, 0, 0, 0, 0, 0,
];
const MEL_B = [
  72, 74, 76, 0, 79, 0, 76, 0, 77, 76, 74, 0, 72, 0, 0, 0,
  74, 76, 77, 0, 81, 0, 77, 0, 79, 77, 76, 0, 74, 0, 0, 0,
  76, 77, 79, 0, 84, 0, 79, 0, 81, 79, 77, 0, 76, 0, 74, 0,
  72, 0, 76, 0, 79, 0, 76, 74, 72, 0, 0, 0, 0, 0, 0, 0,
];
const MEL_C = [
  79, 0, 0, 76, 0, 0, 72, 0, 74, 0, 76, 0, 79, 0, 0, 0,
  81, 0, 0, 79, 0, 0, 76, 0, 77, 0, 79, 0, 76, 0, 0, 0,
  79, 0, 0, 84, 0, 0, 83, 0, 81, 0, 79, 0, 77, 0, 76, 0,
  74, 0, 0, 72, 0, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0,
];
const MEL_BOSS = [
  72, 0, 72, 76, 0, 72, 77, 0, 76, 0, 72, 0, 71, 0, 72, 0,
  72, 0, 72, 76, 0, 72, 79, 0, 77, 0, 76, 0, 74, 0, 0, 0,
];
const I_V_vi_IV = [[48, 55, 64], [43, 55, 62], [45, 52, 60], [41, 53, 60]];
const SONGS = {
  nohara: { bpm: 132, shift: 0, lead: 'triangle', melody: MEL_A, chords: I_V_vi_IV, hat: true },
  okashi: { bpm: 140, shift: 2, lead: 'square', melody: MEL_B, chords: [[48, 55, 64], [45, 52, 60], [41, 53, 60], [43, 55, 62]], hat: true },
  kumo: { bpm: 112, shift: 5, lead: 'sine', melody: MEL_C, chords: [[41, 53, 60], [43, 55, 62], [48, 55, 64], [45, 52, 60]], hat: false },
  umi: { bpm: 124, shift: -3, lead: 'triangle', melody: MEL_B, chords: I_V_vi_IV, hat: true },
  hoshi: { bpm: 104, shift: -5, lead: 'sine', melody: MEL_C, chords: [[45, 52, 60], [41, 53, 60], [48, 55, 64], [43, 55, 62]], hat: false },
  boss: { bpm: 150, shift: 0, lead: 'square', melody: MEL_BOSS, chords: [[48, 55, 64], [43, 55, 62]], hat: true },
};
