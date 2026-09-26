// Web Audioによる音楽と効果音。外部音源は使わない
import {TRACKS, midi, chord} from './music.mjs';

const hz = m => 440 * Math.pow(2, (m - 69) / 12);

export class Sound {
  constructor({enabled = true, music = .7, sfx = .7} = {}) {
    this.enabled = enabled; this.musicVol = music; this.sfxVol = sfx;
    this.ctx = null; this.track = null; this.seq = null; this.last = {};
  }
  init() {
    if (this.ctx) { this.unlock(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.unlock();
    this.master = c.createGain(); this.master.gain.value = this.enabled ? .8 : 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.gain.value = this.musicVol * .55; this.musicBus.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxVol; this.sfxBus.connect(this.master);
    // 残響：ノイズを減衰させたインパルス応答
    const len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.reverb = c.createConvolver(); this.reverb.buffer = ir;
    this.revSend = c.createGain(); this.revSend.gain.value = .32; this.revSend.connect(this.reverb); this.reverb.connect(this.musicBus);
    this.sfxRev = c.createGain(); this.sfxRev.gain.value = .25; this.sfxRev.connect(this.reverb);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.timer = setInterval(() => this.pump(), 25);
    if (this.track) { const id = this.track; this.track = null; this.play(id); }
  }
  // iOS Safari は 'suspended' のほか 'interrupted' にもなり、タップの操作中に鳴らさないと解除されない。
  // 操作のたびに running 以外なら再開し、無音を1つ鳴らして確実に解除する
  unlock() {
    const c = this.ctx; if (!c || this.paused) return;
    if (c.state !== 'running') c.resume().catch(() => {});
    if (!this.unlocked) {
      this.unlocked = true;
      const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, c.sampleRate); s.connect(c.destination); s.start(0);
    }
  }
  setEnabled(on) { this.enabled = on; if (this.ctx) this.master.gain.setTargetAtTime(on ? .8 : 0, this.ctx.currentTime, .05); }
  setMusic(v) { this.musicVol = v; if (this.ctx) this.musicBus.gain.setTargetAtTime(v * .55, this.ctx.currentTime, .05); }
  setSfx(v) { this.sfxVol = v; if (this.ctx) this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, .05); }
  pause() { this.paused = true; if (this.ctx) this.ctx.suspend().catch(() => {}); }
  resume() { this.paused = false; if (this.ctx) this.ctx.resume().catch(() => {}); }

  // ---------- 音楽 ----------
  play(id) {
    if (this.track === id) return;
    this.track = id;
    if (!this.ctx) return;
    const c = this.ctx, now = c.currentTime;
    if (this.seq) { const old = this.seq.bus; old.gain.setTargetAtTime(0, now, .25); setTimeout(() => old.disconnect(), 1500); }
    const bus = c.createGain(); bus.connect(this.musicBus); bus.connect(this.revSend);
    this.seq = id && TRACKS[id] ? {def: TRACKS[id], step: 0, next: now + .15, bus} : null;
  }
  stopMusic() { this.play(null); }
  pump() {
    const s = this.seq, c = this.ctx; if (!s || !c || c.state !== 'running') return;
    const e8 = 60 / s.def.bpm / 2;
    if (s.next < c.currentTime - .5) s.next = c.currentTime + .05;
    while (s.next < c.currentTime + .2) { this.scheduleStep(s, s.step, s.next, e8); s.step++; s.next += e8; }
  }
  scheduleStep(s, step, t, e8) {
    const def = s.def, bars = def.bars, bi = Math.floor(step / 6) % bars.length, pos = step % 6;
    const [cname, mel] = bars[bi], tokens = mel.split(/\s+/), ch = chord(cname), style = def.style, out = s.bus;
    const tok = tokens[pos];
    if (tok && tok !== '-' && tok !== '.') {
      let len = 1; while (tokens[pos + len] === '-') len++;
      const m = midi(tok), dur = len * e8;
      if (style === 'box') this.bell(m, t, dur + .9, .2, out);
      else if (style === 'stage') { this.lead(m, t, dur * .95, .085, 'square', 2600, out); this.bell(m + 12, t, .5, .05, out); }
      else { this.lead(m, t, dur * .95, .075, 'sawtooth', 3200, out, 7); this.lead(m + 12, t, dur * .8, .022, 'square', 4000, out); }
    }
    const tone = (i, oct) => 12 * (oct + 1) + ch.root + ch.tones[i % ch.tones.length] + 12 * Math.floor(i / ch.tones.length);
    const bass = 12 * 3 + ch.root;
    if (style === 'box') {
      if (pos === 0) { this.pluck(bass, t, e8 * 5, .18, 'sine', out); for (let i = 0; i < 3; i++) this.pad(tone(i, 4), t, e8 * 6, .025, out); }
      this.bell(tone([0, 2, 1, 2, 3, 2][pos], 4), t, .6, .045, out);
    } else if (style === 'stage') {
      if (pos === 0) { this.pluck(bass - 12, t, e8 * 2.4, .22, 'triangle', out); this.kick(t, .35, out); }
      if (pos === 2 || pos === 4) for (let i = 0; i < 3; i++) this.pluck(tone(i, 4), t, e8 * .9, .04, 'triangle', out);
      if (pos % 2 === 1) this.hat(t, .05, out);
      this.bell(tone([0, 1, 2, 3, 2, 1][pos], 5), t, .25, .02, out);
    } else {
      if (pos === 0) { this.pluck(bass - 12, t, e8 * 2, .2, 'sawtooth', out, 600); this.kick(t, .55, out); if (bi % 8 === 0 && step % (6 * bars.length) < 6) this.crash(t, out); }
      if (pos === 3) this.pluck(bass, t, e8 * 1.5, .12, 'sawtooth', out, 700);
      if (pos === 2 || pos === 4) { for (let i = 0; i < 3; i++) this.pluck(tone(i, 4), t, e8 * .8, .032, 'square', out, 1800); this.snare(t, .12, out); }
      this.hat(t, pos % 2 ? .07 : .04, out);
      this.bell(tone([0, 1, 2, 3, 4, 2][pos], 5), t, .2, .025, out);
    }
  }
  env(g, t, a, peak, d) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + d); }
  bell(m, t, dur, vol, out) {
    const c = this.ctx, f = hz(m), g = c.createGain(); this.env(g, t, .004, vol, dur); g.connect(out);
    for (const [mul, v] of [[1, 1], [2.01, .3], [3.98, .12]]) {
      const o = c.createOscillator(), gg = c.createGain(); o.frequency.value = f * mul; gg.gain.value = v;
      o.connect(gg); gg.connect(g); o.start(t); o.stop(t + dur + .05);
    }
  }
  lead(m, t, dur, vol, type, cutoff, out, detune = 0) {
    const c = this.ctx, f = hz(m), g = c.createGain(), flt = c.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = cutoff; flt.Q.value = 2;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012);
    g.gain.setTargetAtTime(vol * .7, t + .05, .15); g.gain.setTargetAtTime(.0001, t + Math.max(.06, dur), .05);
    flt.connect(g); g.connect(out);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .012, t + .25);
    lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + .4);
    for (const dt of detune ? [-detune, detune] : [0]) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = dt;
      lg.connect(o.frequency); o.connect(flt); o.start(t); o.stop(t + dur + .4);
    }
  }
  pluck(m, t, dur, vol, type, out, cutoff = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = hz(m);
    this.env(g, t, .006, vol, dur);
    if (cutoff) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(out); o.start(t); o.stop(t + dur + .05);
  }
  pad(m, t, dur, vol, out) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = hz(m); f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .3); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .05);
  }
  noiseHit(t, dur, vol, type, freq, out, q = 1) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  kick(t, vol, out) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
    this.env(g, t, .002, vol, .22); o.connect(g); g.connect(out); o.start(t); o.stop(t + .25);
  }
  hat(t, vol, out) { this.noiseHit(t, .04, vol, 'highpass', 7500, out); }
  snare(t, vol, out) { this.noiseHit(t, .12, vol, 'bandpass', 1900, out, .8); }
  crash(t, out) { this.noiseHit(t, 1.2, .09, 'highpass', 5000, out); }

  // ---------- 効果音 ----------
  tone(f, t, dur, vol, type = 'sine', end = 0, out = this.sfxBus) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f, t); if (end) o.frequency.exponentialRampToValueAtTime(end, t + dur);
    this.env(g, t, .003, vol, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .02);
  }
  sfx(name) {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    const c = this.ctx, t = c.currentTime, gap = {tan: .045, graze: .03, star: .03, item: .04, shot: .07, hitBoss: .06, hitLow: .06, hitEnemy: .06}[name] || 0;
    if (gap && t - (this.last[name] || 0) < gap) return;
    this.last[name] = t;
    const o = this.sfxBus;
    switch (name) {
      case 'shot': this.noiseHit(t, .03, .05, 'highpass', 4200, o); break;
      case 'tan': this.tone(1100, t, .05, .06, 'sine', 420); this.noiseHit(t, .02, .03, 'highpass', 5000, o); break;
      case 'graze': this.noiseHit(t, .05, .12, 'highpass', 6500, o); this.tone(2400, t, .03, .025, 'sine', 3200); break;
      case 'hitBoss': this.noiseHit(t, .03, .06, 'bandpass', 2600, o, 2); break;
      case 'hitLow': this.noiseHit(t, .035, .09, 'bandpass', 4200, o, 3); this.tone(1800, t, .03, .03, 'square'); break;
      case 'hitEnemy': this.noiseHit(t, .03, .05, 'bandpass', 1800, o, 2); break;
      case 'enemyDown': this.noiseHit(t, .22, .16, 'bandpass', 900, o, .7); this.tone(520, t, .18, .06, 'triangle', 90); break;
      case 'item': this.tone(1320, t, .05, .04, 'sine', 1760); break;
      case 'star': this.tone(2200, t, .03, .018, 'sine', 2600); break;
      case 'hit': this.tone(1700, t, .09, .14, 'square', 700); this.noiseHit(t, .12, .16, 'highpass', 3000, o); break;
      case 'death':
        this.tone(1250, t, .07, .12, 'square'); this.tone(1000, t + .07, .5, .14, 'sawtooth', 50);
        this.noiseHit(t + .05, .6, .22, 'lowpass', 2400, o); break;
      case 'bomb':
        this.noiseHit(t, 1.4, .3, 'lowpass', 2600, o); this.tone(90, t, 1, .3, 'sine', 32);
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + i * .05, .9, .05, 'triangle', 0, this.sfxRev)); break;
      case 'deathbomb': [1568, 2093, 2637].forEach((f, i) => this.tone(f, t + i * .04, .35, .07, 'sine')); break;
      case 'spell':
        this.tone(180, t, .7, .12, 'sawtooth', 1400); this.noiseHit(t, .8, .1, 'bandpass', 1500, o, .5);
        [880, 1109, 1319, 1760].forEach((f, i) => this.tone(f, t + .45 + i * .06, .9, .05, 'sine', 0, this.sfxRev)); break;
      case 'capture': [1047, 1319, 1568, 2093, 2637].forEach((f, i) => { this.tone(f, t + i * .07, .8, .08, 'sine'); this.tone(f, t + i * .07, .8, .05, 'sine', 0, this.sfxRev); }); break;
      case 'fail': this.tone(660, t, .2, .07, 'triangle', 600); this.tone(494, t + .18, .35, .07, 'triangle', 440); break;
      case 'extend': [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => this.tone(f, t + i * .06, .5, .09, 'square')); break;
      case 'powerUp': [659, 880, 1319].forEach((f, i) => this.tone(f, t + i * .05, .25, .06, 'triangle')); break;
      case 'tick': this.noiseHit(t, .025, .22, 'highpass', 3800, o); this.tone(2600, t, .02, .05, 'square'); break;
      case 'chime': [330, 660, 990, 1320].forEach((f, i) => this.tone(f, t, 2.2 - i * .3, .09 / (i + 1), 'sine', 0, this.sfxRev)); this.tone(330, t, 1.6, .08); break;
      case 'countdown': this.tone(1320, t, .08, .08, 'square'); break;
      case 'countdownLast': this.tone(1760, t, .12, .1, 'square'); break;
      case 'gear': this.noiseHit(t, .1, .12, 'bandpass', 700, o, 3); this.tone(300, t, .12, .05, 'square', 220); break;
      case 'split': this.tone(2600, t, .15, .05, 'sine', 3900); this.tone(1950, t, .2, .04, 'triangle'); break;
      case 'bloom': [1568, 1976, 2349].forEach((f, i) => this.tone(f, t + i * .025, .35, .035, 'sine', 0, this.sfxRev)); this.noiseHit(t, .15, .06, 'highpass', 4000, o); break;
      case 'orbit': this.tone(440, t, .6, .06, 'sine', 880); this.tone(660, t + .05, .5, .03, 'triangle', 1320); break;
      case 'meteor': this.noiseHit(t, .4, .08, 'bandpass', 3200, o, .6); this.tone(2400, t, .35, .03, 'sine', 900); break;
      case 'laserWarn': this.tone(220, t, .5, .05, 'sawtooth', 440); break;
      case 'bossDown':
        this.noiseHit(t, 2.2, .35, 'lowpass', 1800, o); this.tone(70, t, 1.6, .35, 'sine', 25);
        [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + .3 + i * .09, 1.2, .06, 'triangle', 0, this.sfxRev)); break;
      case 'select': this.tone(1760, t, .04, .04, 'square'); break;
      case 'confirm': this.tone(1320, t, .06, .06, 'square'); this.tone(1980, t + .05, .1, .05, 'square'); break;
      case 'cancel': this.tone(880, t, .08, .05, 'square', 600); break;
      case 'pause': this.tone(988, t, .08, .06, 'triangle'); this.tone(740, t + .08, .12, .05, 'triangle'); break;
    }
  }
}
