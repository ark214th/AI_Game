// おと：こうかおん と きょく を Web Audio で その場で つくる（おとの ファイルは つかわない）
const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const mf = m => 440 * 2 ** ((m - 69) / 12);
// 'c5' 'f#4' 'bb3' → MIDI ばんごう
function midi(n) {
  const m = /^([a-g])([#b]?)(\d)$/.exec(n);
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
// "e5 g5:2 -:1 | ..." → [{b, m, d}]（ながさは はく。かかなければ 1）
function line(str, o = {}) {
  let b = 0; const out = [];
  for (const tok of str.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [n, d = '1'] = tok.split(':'), dur = +d;
    if (n !== '-') out.push({ b, m: midi(n) + (o.tr || 0), d: dur * (o.gate || 0.9), type: o.type || 'triangle', vol: o.vol || 0.2 });
    b += dur;
  }
  return out;
}
const drum = (beats, pat, per = 1) => { const out = []; for (let b = 0; b < beats; b += per) { const ch = pat[Math.round(b / per) % pat.length]; if (ch !== '.') out.push({ b, drum: ch }); } return out; };

const LOOPS = {
  hub: { bpm: 104, beats: 32, parts: [
    line('e5 g5 c6:2 | b5 g5 e5:2 | f5 a5 c6:2 | b5:2 g5:2 | e5 g5 c6:2 | d6 b5 g5:2 | a5 f5 d5 b4 | c5:4', { vol: 0.16 }),
    line('c3:2 g3:2 | e3:2 g3:2 | f3:2 a3:2 | g3:2 b3:2 | c3:2 g3:2 | g3:2 b3:2 | f3:2 g3:2 | c3:4', { vol: 0.2, type: 'sine' }),
    drum(32, 'h.h.', 1),
  ] },
  star: { bpm: 138, beats: 24, parts: [
    line('a5:2 c6 | f6:3 | e6:2 c6 | d6:3 | bb5:2 d6 | c6:2 a5 | g5:2 e5 | f5:3', { vol: 0.17 }),
    line('f3 a4 a4 | f3 a4 a4 | c3 g4 g4 | d3 a4 a4 | bb2 f4 f4 | f3 a4 a4 | c3 g4 g4 | f3 a4 c5', { vol: 0.13, type: 'sine', gate: 0.5 }),
    line('c5:3 | a4:3 | g4:3 | f4:3 | d5:3 | c5:3 | bb4:3 | a4:3', { vol: 0.07, type: 'sine' }),
    drum(24, 'khh', 1),
  ] },
  hero: { bpm: 122, beats: 32, parts: [
    line('c5:1.5 c5:.5 g5:2 | e5 f5 g5:2 | a5:1.5 a5:.5 f5 a5 | g5:4 | f5:1.5 f5:.5 a5:2 | e5 g5 c6:2 | d6 b5 g5 b5 | c6:4', { vol: 0.09, type: 'square' }),
    line('c3 c3 e3 g3 | c3 c3 e3 g3 | f3 f3 a3 c4 | g3 g3 b3 d4 | f3 f3 a3 c4 | c3 c3 e3 g3 | g3 g3 b3 d4 | c3 g3 c3:2', { vol: 0.15, gate: 0.6 }),
    drum(32, 'k.s.k.s.', 0.5),
  ] },
  race: { bpm: 152, beats: 32, parts: [
    line('g5 g5 e5 g5 | c6:2 g5:2 | a5 a5 f5 a5 | g5:4 | g5 g5 e5 g5 | c6:2 e6:2 | d6 c6 b5 d6 | c6:4', { vol: 0.1, type: 'square' }),
    line('c3 g3 c3 g3 | c3 g3 c3 g3 | f3 c4 f3 c4 | g3 d4 g3 d4 | c3 g3 c3 g3 | a2 e3 a2 e3 | g3 d4 g3 d4 | c3 g3 c3:2', { vol: 0.16, gate: 0.5 }),
    drum(32, 'k.hsk.hs', 0.5),
  ] },
  bug: { bpm: 144, beats: 16, parts: [
    line('e5 -:.5 e5:.5 g5 e5 | bb5:2 a5:2 | e5 -:.5 e5:.5 g5 e5 | d5:2 eb5:2', { vol: 0.08, type: 'square' }),
    line('e2 e3 e2 e3 | e2 e3 e2 e3 | e2 e3 e2 e3 | d2 d3 eb2 eb3', { vol: 0.16, type: 'sawtooth', gate: 0.5 }),
    drum(16, 'k.hsk.hs', 0.5),
  ] },
};

// リズムの うた：ふめん と おなじ タイミングで メロディが なる
function songEvents(def) {
  const out = [], bars = def.bars.length;
  const minor = r => [2, 4, 9].includes(((r % 12) + 12) % 12);
  for (let bi = 0; bi < bars; bi++) {
    const root = def.chords[bi % def.chords.length], tri = minor(root) ? [0, 3, 7] : [0, 4, 7], b0 = bi * 4;
    out.push({ b: b0, m: def.key - 24 + root, d: 1.6, type: 'triangle', vol: 0.2 }, { b: b0 + 2, m: def.key - 24 + root + 7, d: 1.6, type: 'triangle', vol: 0.17 });
    for (const off of [1, 3]) for (const iv of tri) out.push({ b: b0 + off, m: def.key + root + iv, d: 0.3, type: 'sine', vol: 0.045 });
    for (let i = 0; i < 4; i++) { out.push({ b: b0 + i, drum: i % 2 ? 's' : 'k' }); out.push({ b: b0 + i + 0.5, drum: 'h' }); }
    if (bi === 1) for (let i = 0; i < 4; i++) out.push({ b: b0 + i, m: def.key + 24, d: 0.15, type: 'square', vol: 0.06 });   // よっつ かぞえる
    [...def.bars[bi]].forEach((ch, i) => { if (ch !== '.') out.push({ b: b0 + i / 2, m: def.key + 12 + root + tri[+ch - 1], d: 0.45, type: 'triangle', vol: 0.2 }, { b: b0 + i / 2, m: def.key + 24 + root + tri[+ch - 1], d: 0.3, type: 'sine', vol: 0.06 }); });
  }
  for (const iv of [0, 4, 7, 12]) out.push({ b: bars * 4, m: def.key + iv, d: 2, type: 'triangle', vol: 0.12 });
  return out.sort((a, b) => a.b - b.b);
}

export class Sound {
  constructor(on = true) { this.on = on; this.ctx = null; this.seq = null; this.loopId = null; }

  unlock() {
    if (!this.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.6 : 0; this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.music = this.ctx.createGain(); this.music.gain.value = 0.75; this.music.connect(this.master);
      const len = this.ctx.sampleRate * 0.4, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.ctx.destination); s.start(0);
      setInterval(() => this.tick(), 60);
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }
  now() { return this.ctx ? this.ctx.currentTime : performance.now() / 1000; }
  running() { return !!this.ctx && this.ctx.state === 'running'; }
  setOn(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.6 : 0, this.ctx.currentTime, 0.02); }

  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, at = 0, when = null, dest = this.sfx, attack = 0.008 } = {}) {
    if (!this.ctx) return;
    const t = when ?? this.ctx.currentTime + at;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.03);
  }
  noise(dur, { vol = 0.2, at = 0, when = null, hp = 3000, dest = this.sfx } = {}) {
    if (!this.ctx) return;
    const t = when ?? this.ctx.currentTime + at;
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
  }
  arp(list, step, dur, o = {}) { list.forEach((f, i) => this.tone(f, i === list.length - 1 ? dur * (o.last || 1) : dur, { type: 'triangle', vol: 0.2, ...o, at: (o.at || 0) + i * step })); }

  play(name) {
    if (!this.ctx || !this.on) return;
    switch (name) {
      case 'tap': this.tone(700, 0.07, { vol: 0.14 }); break;
      case 'lane': this.tone(520, 0.08, { type: 'triangle', vol: 0.12, slide: 1.5 }); break;
      case 'boost': this.tone(300, 0.5, { type: 'sawtooth', vol: 0.08, slide: 4 }); this.arp([784, 1047, 1568], 0.06, 0.14, { vol: 0.12 }); break;
      case 'page': this.tone(880, 0.06, { vol: 0.1 }); this.tone(1175, 0.08, { vol: 0.08, at: 0.05 }); break;
      case 'ok': this.arp([659, 880, 1319], 0.07, 0.16); break;
      case 'star': { const n = [1319, 1568, 1760, 2093][Math.floor(Math.random() * 4)]; this.tone(n, 0.14, { vol: 0.1 }); break; }
      case 'graze': this.tone(2400, 0.05, { vol: 0.04 }); break;
      case 'shotHit': this.tone(1200, 0.03, { type: 'square', vol: 0.015 }); break;
      case 'hit': this.tone(190, 0.3, { vol: 0.3, slide: 3 }); this.tone(380, 0.2, { type: 'triangle', vol: 0.1, slide: 2, at: 0.04 }); break;
      case 'pop': this.tone(900, 0.09, { vol: 0.18, slide: 0.4 }); this.tone(1500, 0.1, { vol: 0.08, at: 0.05 }); break;
      case 'spell': this.arp([523, 784, 1047, 1568], 0.06, 0.22, { vol: 0.14 }); this.noise(0.4, { vol: 0.05, hp: 5000 }); break;
      case 'phaseClear': this.arp([784, 988, 1175, 1568], 0.07, 0.2); break;
      case 'bossDown': this.arp([523, 659, 784, 1047, 1319, 1568], 0.07, 0.25, { last: 3 }); this.noise(0.5, { vol: 0.08, hp: 2000 }); break;
      case 'swing': this.noise(0.1, { vol: 0.12, hp: 4000 }); this.tone(600, 0.08, { type: 'triangle', vol: 0.06, slide: 2 }); break;
      case 'cut': this.noise(0.12, { vol: 0.14, hp: 2500 }); break;
      case 'key': this.arp([988, 1319, 1976], 0.08, 0.2); break;
      case 'door': this.tone(110, 0.4, { type: 'square', vol: 0.08, slide: 0.6 }); this.arp([392, 494, 587, 784], 0.08, 0.2, { at: 0.2 }); break;
      case 'locked': this.tone(160, 0.1, { type: 'square', vol: 0.07 }); this.tone(160, 0.1, { type: 'square', vol: 0.07, at: 0.14 }); break;
      case 'push': this.tone(120, 0.12, { type: 'square', vol: 0.05, slide: 0.7 }); break;
      case 'switch': this.arp([660, 880], 0.08, 0.14); break;
      case 'chest': this.arp([392, 494, 587, 698, 784, 988, 1175], 0.13, 0.2, { last: 5 }); for (const f of [392, 494, 587]) this.tone(f, 1.2, { type: 'triangle', vol: 0.08, at: 0.95 }); break;
      case 'chestAppear': this.arp([523, 659, 784, 1047], 0.09, 0.2); break;
      case 'thud': this.tone(110, 0.18, { vol: 0.35, slide: 0.5 }); this.noise(0.12, { vol: 0.08, hp: 400 }); break;
      case 'dizzy': this.arp([880, 784, 698, 659, 587], 0.07, 0.12, { vol: 0.12 }); break;
      case 'bossHit': this.tone(300, 0.14, { type: 'square', vol: 0.1, slide: 0.5 }); this.tone(900, 0.12, { vol: 0.14, at: 0.04 }); break;
      case 'clang': this.tone(1400, 0.08, { type: 'square', vol: 0.05 }); break;
      case 'call': this.arp([440, 523, 440, 523], 0.09, 0.1, { type: 'square', vol: 0.06 }); break;
      case 'perfect': this.tone(1568, 0.12, { vol: 0.1 }); this.tone(2093, 0.16, { vol: 0.07, at: 0.05 }); break;
      case 'good': this.tone(1175, 0.1, { vol: 0.08 }); break;
      case 'warp': this.tone(200, 1.1, { type: 'sawtooth', vol: 0.07, slide: 6 }); this.noise(0.9, { vol: 0.05, hp: 1500 }); break;
      case 'henshin': this.arp([523, 659, 784, 1047, 1319, 1568, 2093], 0.055, 0.2, { last: 3 }); this.noise(0.5, { vol: 0.06, hp: 6000, at: 0.3 }); break;
      case 'glitch': for (let i = 0; i < 6; i++) this.tone(200 + Math.random() * 1400, 0.05, { type: 'square', vol: 0.06, at: i * 0.05 }); break;
      case 'laugh': this.arp([523, 466, 523, 466, 523], 0.09, 0.08, { type: 'square', vol: 0.08 }); break;
      case 'cry': this.tone(660, 0.5, { type: 'triangle', vol: 0.12, slide: 0.6 }); this.tone(600, 0.5, { type: 'triangle', vol: 0.12, slide: 0.6, at: 0.5 }); break;
      case 'clear': this.arp([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 0.2, { vol: 0.22, last: 4 }); break;
      case 'cheer': this.noise(1.2, { vol: 0.07, hp: 1800 }); this.arp([784, 988, 1175, 1568], 0.08, 0.2); break;
    }
  }

  // ---- きょくを ながす ----
  loop(id, rate = 1) {
    const key = id + rate;
    if (this.loopId === key && this.seq) return;
    this.loopId = key;
    if (!id) { this.seq = null; return; }
    const L = LOOPS[id], sec = 60 / (L.bpm * rate);
    this.seq = { ev: L.parts.flat().sort((a, b) => a.b - b.b), sec, len: L.beats * sec, start: this.now() + 0.08, i: 0, loop: true };
  }
  // リズムの うた。もどりち＝うたの 0びょうめ に あたる じこく
  song(def) {
    const sec = 60 / def.bpm, start = this.now() + 0.25;
    this.loopId = null;
    this.seq = { ev: songEvents(def), sec, len: 1e9, start, i: 0, loop: false };
    return start;
  }
  stop() { this.seq = null; this.loopId = null; }
  tick() {
    const q = this.seq;
    if (!q || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (q.start + q.len < now - 1) { q.start = now + 0.05; q.i = 0; }   // ながく とまって いたら あたまから
    for (let guard = 0; guard < 200; guard++) {
      if (q.i >= q.ev.length) { if (!q.loop) { this.seq = null; return; } q.i = 0; q.start += q.len; }
      const e = q.ev[q.i], when = q.start + e.b * q.sec;
      if (when > now + 0.25) return;
      q.i++;
      if (when < now - 0.05) continue;
      if (e.drum === 'k') this.tone(130, 0.14, { vol: 0.3, slide: 0.4, when, dest: this.music });
      else if (e.drum === 's') this.noise(0.1, { vol: 0.1, hp: 1800, when, dest: this.music });
      else if (e.drum === 'h') this.noise(0.04, { vol: 0.04, hp: 7000, when, dest: this.music });
      else this.tone(mf(e.m), e.d * q.sec, { type: e.type, vol: e.vol, when, dest: this.music, attack: 0.012 });
    }
  }
}
