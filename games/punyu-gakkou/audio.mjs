// こうかおん・チャイム・BGM・ダンスの きょく（Web Audio で つくる。おとの ファイルは つかわない）
import { COUNT_IN, beatOf, songBars } from './core.mjs';
import { SONGS } from './data.mjs';

const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

export class Sound {
  constructor(on = true) { this.on = on; this.ctx = null; this.last = {}; this.bgm = null; this.song = null; }

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
      const len = this.ctx.sampleRate * 0.4;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.timer = setInterval(() => this.schedule(), 50);
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }
  setOn(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.02); }
  now() { return this.ctx ? this.ctx.currentTime : performance.now() / 1000; }

  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, at = 0, dest = this.sfx, attack = 0.005, abs = null } = {}) {
    if (!this.ctx) return;
    const t = abs ?? this.ctx.currentTime + at;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  hiss(t, dur, vol, freq = 6000, dest = this.music) {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = 'highpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
  }

  play(type, gap = 0) {
    if (!this.ctx || !this.on) return;
    const now = this.ctx.currentTime;
    if (gap && this.last[type] && now - this.last[type] < gap) return;
    this.last[type] = now;
    const R = Math.random;
    switch (type) {
      case 'tap': this.tone(660, 0.07, { vol: 0.15 }); break;
      case 'pop': this.tone(500 + R() * 200, 0.1, { type: 'triangle', vol: 0.2, slide: 1.8 }); break;
      case 'pick': this.tone(700, 0.08, { type: 'triangle', vol: 0.15, slide: 1.4 }); break;
      case 'drop': this.tone(300, 0.12, { vol: 0.25, slide: 0.6 }); this.tone(900, 0.08, { vol: 0.08, at: 0.05 }); break;
      case 'no': this.tone(400, 0.1, { type: 'triangle', vol: 0.14 }); this.tone(340, 0.14, { type: 'triangle', vol: 0.14, at: 0.12 }); break;
      case 'ok': [659, 880].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.16, at: i * 0.08 })); break;
      case 'yay': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.18, at: i * 0.07 })); break;
      case 'shine': [1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.3, { vol: 0.12, at: i * 0.08 })); break;
      case 'sticker': [988, 1319, 1760].forEach((f, i) => this.tone(f, 0.16, { type: 'triangle', vol: 0.14, at: i * 0.05 })); break;
      case 'munch': [0, 0.12].forEach(a => this.tone(180 + R() * 60, 0.07, { type: 'square', vol: 0.06, slide: 0.6, at: a })); break;
      case 'gulp': this.tone(300, 0.12, { vol: 0.2, slide: 1.8 }); this.tone(420, 0.12, { vol: 0.15, slide: 1.6, at: 0.14 }); break;
      case 'jump': this.tone(380, 0.16, { type: 'triangle', vol: 0.18, slide: 2 }); break;
      case 'trip': this.tone(300, 0.25, { type: 'triangle', vol: 0.18, slide: 0.5 }); break;
      case 'whoosh': this.tone(900, 0.18, { vol: 0.06, slide: 0.4 }); break;
      case 'perfect': this.tone(1568, 0.12, { type: 'triangle', vol: 0.12 }); this.tone(2093, 0.1, { vol: 0.07, at: 0.04 }); break;
      case 'good': this.tone(1175, 0.1, { type: 'triangle', vol: 0.1 }); break;
      case 'miss': this.tone(220, 0.1, { type: 'triangle', vol: 0.06 }); break;
      case 'bell': this.tone(1568, 0.6, { vol: 0.18 }); this.tone(1976, 0.5, { vol: 0.12, at: 0.18 }); break;
      case 'door': this.tone(300, 0.2, { type: 'triangle', vol: 0.15, slide: 1.5 }); break;
      case 'stamp': this.tone(240, 0.12, { type: 'triangle', vol: 0.2, slide: 0.7 }); this.tone(1200, 0.12, { vol: 0.06, at: 0.04 }); break;
      case 'pen': this.tone(1800 + R() * 400, 0.03, { vol: 0.015 }); break;
      case 'night': [659, 523, 440, 392].forEach((f, i) => this.tone(f, 0.6, { vol: 0.16, at: i * 0.3 })); break;
      case 'morning': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.18, at: i * 0.12 })); break;
      case 'fanfare': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, i === 6 ? 0.8 : 0.2, { type: 'triangle', vol: 0.2, at: i * 0.11 })); break;
      // がっこうの チャイム（キーン コーン カーン コーン）
      case 'chime': [[76, 0], [72, 0.55], [74, 1.1], [67, 1.65], [67, 2.6], [74, 3.15], [76, 3.7], [72, 4.25]].forEach(([n, a]) => {
        this.tone(mtof(n), 1.4, { vol: 0.16, at: a, attack: 0.01 }); this.tone(mtof(n + 12), 0.7, { vol: 0.04, at: a });
      }); break;
    }
  }

  // ---------- ゆったりした BGM（オルゴールふう） ----------
  // kind：'home'（あさ・いえ）/ 'school'（がっこう）/ 'night'
  startBgm(kind = 'home') {
    if (this.bgm && this.bgm.kind === kind) return;
    this.bgm = { kind, next: this.ctx ? this.ctx.currentTime + 0.15 : 0, step: 0 };
  }
  stopBgm() { this.bgm = null; }

  // ---------- ダンスの きょく ----------
  // かえりちは きょくの 0はくめの とき（ctx の じかん）
  startSong(id = 'kirakira', part = 0, delay = 0.6) {
    const bars = songBars(id, part);
    const song = { id, def: SONGS[id], bars, beatLen: beatOf(id), total: COUNT_IN + bars.length * 4, start: this.now() + delay, beat: 0 };
    this.bgm = null;
    this.song = song;
    return song.start;
  }
  stopSong() { this.song = null; }
  songTime() { return this.song ? this.now() - this.song.start : -1; }

  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ahead = this.ctx.currentTime + 0.25;
    if (this.song) {
      const sg = this.song;
      while (sg.beat < sg.total * 2 && sg.start + sg.beat * sg.beatLen / 2 < ahead) {
        this.songStep(sg, sg.beat, sg.start + sg.beat * sg.beatLen / 2);
        sg.beat++;
      }
    }
    if (this.bgm && !this.song) {
      const b = this.bgm, spb = 60 / (b.kind === 'school' ? 112 : 92) / 2;
      if (b.next < this.ctx.currentTime) b.next = this.ctx.currentTime + 0.05;
      while (b.next < ahead) { this.bgmStep(b, b.step, b.next, spb); b.next += spb; b.step++; }
    }
  }

  bgmStep(b, step, t, spb) {
    const set = BGM[b.kind] || BGM.home;
    const i = step % set.mel.length, chord = set.chords[Math.floor(i / 16) % set.chords.length];
    const m = set.mel[i], dest = this.music;
    const wave = b.kind === 'school' ? 'triangle' : 'sine';
    if (m) { this.tone(mtof(m), spb * 2.6, { type: wave, vol: b.kind === 'school' ? 0.11 : 0.16, abs: t, dest }); this.tone(mtof(m + 12), spb * 1.4, { vol: 0.035, abs: t, dest }); }
    if (i % 8 === 0) this.tone(mtof(chord[0]), spb * 7, { type: 'triangle', vol: 0.1, abs: t, dest, attack: 0.03 });
    if (i % 4 === 2) chord.slice(1).forEach(n => this.tone(mtof(n), spb * 1.6, { vol: 0.045, abs: t, dest }));
  }

  // 8ぶおんぷ ずつ（h：はんぱく の ばんごう）
  songStep(sg, h, t) {
    const dest = this.music, beat = h / 2, def = sg.def, BEAT = sg.beatLen;
    if (beat < COUNT_IN) {
      if (h % 2 === 0) this.tone(beat === 0 ? 1568 : 1175, 0.08, { type: 'square', vol: 0.06, abs: t, dest: this.sfx });
      return;
    }
    const b = beat - COUNT_IN, bar = Math.floor(b / 4), inBar = b - bar * 4;
    if (bar >= sg.bars.length - 1) {
      // さいごの じゃーん
      if (h === (COUNT_IN + (sg.bars.length - 1) * 4) * 2) { [...def.chords[0], def.chords[0][0] - 12].forEach(n => this.tone(mtof(n), 1.6, { type: 'triangle', vol: 0.11, abs: t, dest, attack: 0.01 })); this.hiss(t, 0.8, 0.12, 3000); }
      return;
    }
    const chord = def.chords[bar % def.chords.length], style = def.style || 'base';
    // たいこ
    if (style === 'soft') {
      if (inBar === 0 && h % 2 === 0) this.tone(140, 0.2, { vol: 0.3, slide: 0.4, abs: t, dest });
      if (h % 2 === 0) this.hiss(t, 0.03, 0.02, 8000);
    } else {
      if (h % 2 === 0) this.tone(150, 0.16, { vol: 0.5, slide: 0.3, abs: t, dest });
      if (style === 'pop' && h % 4 === 3) this.tone(150, 0.12, { vol: 0.3, slide: 0.3, abs: t, dest });
      if (inBar === 1 || inBar === 3) this.hiss(t, 0.14, 0.25, 1500);
      this.hiss(t, 0.04, h % 2 ? 0.06 : 0.03, 7000);
    }
    // ベース
    if (style !== 'soft' || h % 2 === 0) this.tone(mtof(chord[0] - 12), BEAT * 0.45, { type: 'triangle', vol: 0.28, abs: t, dest });
    if (style === 'pop' && h % 2 === 1) this.tone(mtof(chord[0]), BEAT * 0.25, { type: 'triangle', vol: 0.12, abs: t, dest });
    // コード（うらはく）
    if (h % 2 === 1) chord.slice(1).forEach(n => this.tone(mtof(n), BEAT * 0.3, { type: style === 'soft' ? 'sine' : 'square', vol: style === 'soft' ? 0.05 : 0.025, abs: t, dest }));
    // メロディ（4しょうせつで ひとまわり）
    if (bar >= def.melFrom) {
      const m = def.mel[(bar % 4) * 8 + (h % 8)];
      if (m) this.tone(mtof(m + (bar >= def.octaveFrom ? 12 : 0)), BEAT * 0.4, { type: 'triangle', vol: 0.13, abs: t, dest });
    }
  }
  // けんばんハーモニカの おと（おんがくの じゅぎょう）
  kenban(n) { if (this.ctx && this.on) { this.tone(mtof(n), 0.35, { type: 'square', vol: 0.06, attack: 0.02 }); this.tone(mtof(n), 0.35, { type: 'sine', vol: 0.12, attack: 0.02 }); } }
  // はくしゅ
  applause(sec = 2.5) {
    if (!this.ctx || !this.on) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < sec * 28; i++) this.hiss(now + Math.random() * sec, 0.05, 0.05 + Math.random() * 0.08, 1200 + Math.random() * 2500, this.sfx);
  }
}

const BGM = {
  home: {
    mel: [
      72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 76, 0, 74, 0, 0, 0,
      71, 0, 74, 0, 77, 0, 74, 0, 76, 0, 74, 0, 72, 0, 0, 0,
      72, 0, 76, 0, 79, 0, 84, 0, 81, 0, 79, 0, 77, 0, 76, 0,
      74, 0, 77, 0, 76, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0,
    ],
    chords: [[48, 64, 67], [43, 62, 65], [45, 64, 69], [43, 62, 67]],
  },
  school: {
    mel: [
      67, 0, 72, 74, 76, 0, 74, 72, 74, 0, 76, 0, 67, 0, 0, 0,
      69, 0, 72, 74, 76, 0, 79, 0, 77, 76, 74, 0, 72, 0, 0, 0,
      77, 0, 76, 74, 76, 0, 72, 0, 74, 0, 71, 0, 67, 0, 0, 0,
      69, 0, 71, 0, 72, 0, 76, 0, 74, 0, 74, 76, 72, 0, 0, 0,
    ],
    chords: [[48, 64, 67], [41, 65, 69], [43, 62, 67], [48, 64, 67]],
  },
  night: {
    mel: [
      76, 0, 0, 0, 72, 0, 0, 0, 74, 0, 0, 0, 67, 0, 0, 0,
      69, 0, 0, 0, 72, 0, 0, 0, 71, 0, 0, 0, 67, 0, 0, 0,
    ],
    chords: [[45, 60, 64], [41, 60, 65], [43, 59, 62], [48, 60, 64]],
  },
};
