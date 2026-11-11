// Web Audio による音楽と効果音。外部の音源ファイルは使わず、楽器も太鼓も残響もその場で合成する
import {SONGS} from './songs.mjs';
import {compileSong} from './music.mjs';

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const COMPILED = {};
export const songData = id => COMPILED[id] || (COMPILED[id] = compileSong(SONGS[id]));

// 太鼓の音量。k キック s スネア h ハット O 開いたハット c クラッシュ t タム r トライアングル b タンバリン T ティンパニ
const DRUM_VOL = {k: .95, s: .5, h: .2, O: .2, c: .3, t: .5, r: .2, b: .18, T: .8};

export class Sound {
  constructor({enabled = true, music = .7, sfx = .7} = {}) {
    this.enabled = enabled; this.musicVol = music; this.sfxVol = sfx;
    this.ctx = null; this.track = null; this.seq = null; this.last = {}; this.pulses = []; this.section = '';
  }
  // 最初のタップやキー入力で呼ぶ。ctx を渡すとその場で組み立てる（オフライン書き出し・検証用）
  init(ctx) {
    if (this.ctx) { this.unlock(); return; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    const c = this.ctx = ctx || (AC ? new AC({latencyHint: 'interactive'}) : null); if (!c) return;
    this.offline = !!ctx;
    this.unlock();
    this.master = c.createGain(); this.master.gain.value = this.enabled ? .85 : 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -15; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .16;
    this.master.connect(comp); comp.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.gain.value = this.musicVol * .62; this.musicBus.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxVol; this.sfxBus.connect(this.master);
    if (c.createAnalyser) { this.analyser = c.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = .78; this.musicBus.connect(this.analyser); this.spec = new Uint8Array(this.analyser.frequencyBinCount); }
    // 残響：高音ほど早く消えるノイズを左右別々に作る（ホールの響き）
    const sr = c.sampleRate, len = Math.floor(sr * 2.6), ir = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr, a = Math.min(.9, .12 + t * .5);
        lp += (1 - a) * ((Math.random() * 2 - 1) - lp);
        d[i] = t < .012 ? 0 : lp * Math.exp(-t / .52) * (t < .08 ? 1.6 : 1);
      }
    }
    this.reverb = c.createConvolver(); this.reverb.buffer = ir;
    this.revIn = c.createGain(); this.revIn.gain.value = .9; this.revIn.connect(this.reverb); this.reverb.connect(this.musicBus);
    this.sfxRev = c.createGain(); this.sfxRev.gain.value = .3; this.sfxRev.connect(this.reverb);
    // 左右に跳ね返るディレイ（曲のテンポに合わせる）
    this.dlyIn = c.createGain();
    this.dlyL = c.createDelay(1.5); this.dlyR = c.createDelay(1.5);
    const fb = c.createGain(); fb.gain.value = .36; const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3200;
    this.dlyIn.connect(tone); tone.connect(this.dlyL); this.dlyL.connect(this.dlyR); this.dlyR.connect(fb); fb.connect(this.dlyL);
    this.pan(this.dlyL, -.6).connect(this.musicBus); this.pan(this.dlyR, .6).connect(this.musicBus);
    this.noise = c.createBuffer(1, sr, sr);
    const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.buildWaves(); this.buildDrums();
    if (!this.offline) this.timer = setInterval(() => this.pump(), 25);
    if (this.track) { const id = this.track; this.track = null; this.play(id); }
  }
  pan(node, p) {
    const c = this.ctx; if (!c.createStereoPanner || !p) return node;
    const sp = c.createStereoPanner(); sp.pan.value = p; node.connect(sp); return sp;
  }
  // iOS Safari は 'suspended' のほか 'interrupted' にもなり、タップの操作中に鳴らさないと解除されない
  unlock() {
    const c = this.ctx; if (!c || this.paused || this.offline) return;
    if (c.state !== 'running') c.resume().catch(() => {});
    if (!this.unlocked) {
      this.unlocked = true;
      const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, c.sampleRate); s.connect(c.destination); s.start(0);
    }
  }
  setEnabled(on) { this.enabled = on; if (this.ctx) this.master.gain.setTargetAtTime(on ? .85 : 0, this.ctx.currentTime, .05); }
  setMusic(v) { this.musicVol = v; if (this.ctx) this.musicBus.gain.setTargetAtTime(v * .62, this.ctx.currentTime, .05); }
  setSfx(v) { this.sfxVol = v; if (this.ctx) this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, .05); }
  pause() { this.paused = true; if (this.ctx) this.ctx.suspend().catch(() => {}); }
  resume() { this.paused = false; if (this.ctx) this.ctx.resume().catch(() => {}); }

  // ---------- 音色のもと ----------
  buildWaves() {
    const c = this.ctx, wave = amps => {
      const re = new Float32Array(amps.length + 1), im = new Float32Array(amps.length + 1);
      amps.forEach((a, i) => { im[i + 1] = a; });
      return c.createPeriodicWave(re, im);
    };
    const series = (n, fn) => Array.from({length: n}, (_, i) => fn(i + 1));
    this.waves = {
      piano: wave(series(16, n => Math.pow(n, -1.25) * (n % 7 === 0 ? .3 : 1) * (1 + .25 * Math.sin(n * 1.7)))),
      harp: wave(series(10, n => Math.pow(n, -1.6) * (n % 2 ? 1 : .55))),
      harpsi: wave(series(28, n => Math.pow(n, -.62) * (n % 3 === 0 ? .55 : 1))),
      flute: wave([1, .34, .1, .05, .02]),
      organ: wave([1, .72, .5, .12, .3, .06, .1, .22, .04, .08, 0, .1]),
      brass: wave(series(20, n => Math.pow(n, -.95) * (n === 2 ? 1.15 : 1))),
    };
  }
  buildDrums() {
    const c = this.ctx, sr = c.sampleRate, TAU = Math.PI * 2;
    const make = (sec, fn) => {
      const n = Math.floor(sr * sec), buf = c.createBuffer(1, n, sr), d = buf.getChannelData(0); let peak = 0;
      fn(d, n); for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
      if (peak > 0) for (let i = 0; i < n; i++) d[i] *= .92 / peak;
      const fade = Math.min(n, Math.floor(sr * .004)); for (let i = 0; i < fade; i++) d[n - 1 - i] *= i / fade;
      return buf;
    };
    // 高域だけ残したノイズ
    const hiss = (d, n, fc, amp, tau, from = 0) => { const a = 1 - Math.exp(-TAU * fc / sr); let lp = 0; for (let i = 0; i < n; i++) { const x = Math.random() * 2 - 1; lp += a * (x - lp); d[i] += (x - lp) * amp * Math.exp(-(i / sr) / tau) * (i / sr < from ? 0 : 1); } };
    const sweep = (d, n, f0, f1, ftau, amp, tau) => { let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * (f1 + (f0 - f1) * Math.exp(-t / ftau)) / sr; d[i] += Math.sin(ph) * amp * Math.exp(-t / tau); } };
    this.drums = {
      k: make(.34, (d, n) => { sweep(d, n, 165, 46, .032, 1, .12); hiss(d, Math.floor(sr * .006), 2000, .5, .002); }),
      s: make(.22, (d, n) => { hiss(d, n, 1700, .9, .06); sweep(d, n, 240, 180, .02, .55, .045); }),
      h: make(.06, (d, n) => hiss(d, n, 7500, 1, .013)),
      O: make(.32, (d, n) => hiss(d, n, 7000, 1, .085)),
      c: make(1.7, (d, n) => { hiss(d, n, 4200, 1, .42); for (let i = 0; i < n; i++) d[i] *= 1 + .25 * Math.sin(i / sr * TAU * 417) * Math.sin(i / sr * TAU * 733); }),
      t: make(.3, (d, n) => sweep(d, n, 210, 105, .05, 1, .1)),
      r: make(.6, (d, n) => { for (let i = 0; i < n; i++) { const t = i / sr; d[i] = (Math.sin(TAU * 4186 * t) + .6 * Math.sin(TAU * 6347 * t) + .3 * Math.sin(TAU * 8911 * t)) * Math.exp(-t / .15); } }),
      b: make(.14, (d, n) => { hiss(d, n, 6000, 1, .035); for (let i = 0; i < n; i++) d[i] *= .6 + .4 * Math.abs(Math.sin(i / sr * TAU * 38)); }),
      T: make(1.1, (d, n) => { sweep(d, n, 104, 82, .05, 1, .36); sweep(d, n, 156, 123, .05, .35, .2); sweep(d, n, 208, 164, .05, .16, .12); const m = Math.floor(sr * .03); let lp = 0; for (let i = 0; i < m; i++) { lp += .06 * ((Math.random() * 2 - 1) - lp); d[i] += lp * 3 * (1 - i / m); } }),
    };
  }

  // ---------- 音楽 ----------
  play(id) {
    if (this.track === id) return;
    this.track = id;
    if (!this.ctx) return;
    const c = this.ctx, now = c.currentTime;
    if (this.seq) { const old = this.seq; old.bus.gain.setTargetAtTime(0, now, .22); old.dead = true; if (!this.offline) setTimeout(() => old.bus.disconnect(), 1800); }
    this.seq = null; this.pulses = []; this.section = '';
    if (!id || !SONGS[id]) return;
    const song = SONGS[id], data = songData(id), bus = c.createGain();
    bus.connect(this.musicBus);
    // パートごとに 音量 → 定位 → 出力。残響とディレイへは別に送る
    const outs = {};
    for (const [name, tr] of Object.entries(song.tracks)) {
      const g = c.createGain(); g.gain.value = tr.vol ?? .5;
      this.pan(g, tr.pan || 0).connect(bus);
      const rv = c.createGain(); rv.gain.value = tr.rev ?? .22; g.connect(rv); rv.connect(this.revIn);
      if (tr.dly) { const dl = c.createGain(); dl.gain.value = tr.dly; g.connect(dl); dl.connect(this.dlyIn); }
      outs[name] = g;
    }
    const dr = c.createGain(); dr.gain.value = .8; dr.connect(bus);
    const drv = c.createGain(); drv.gain.value = .1; dr.connect(drv); drv.connect(this.revIn);
    const spb = 60 / song.bpm;
    this.dlyL.delayTime.setValueAtTime(spb * .75, now); this.dlyR.delayTime.setValueAtTime(spb * .75, now);
    // 全パートを時刻順の一本の列にしておく
    const ev = [];
    for (const [name, list] of Object.entries(data.tracks)) for (const e of list) ev.push({t: e.t, tr: name, inst: e.inst || song.tracks[name].inst, e});
    for (const d of data.drums) ev.push({t: d.t, drum: d});
    for (const m of data.marks) ev.push({t: m.t, mark: m.name});
    for (let b = 0; b < data.length; b++) ev.push({t: b, beat: b % data.bar === 0 ? 1 : .55});
    ev.sort((a, b) => a.t - b.t);
    const loopIdx = ev.findIndex(e => e.t >= data.loopStart - 1e-9);
    this.seq = {id, song, data, ev, i: 0, loopIdx, base: now + .12, spb, bus, outs, dr};
  }
  stopMusic() { this.play(null); }
  pump(until = this.ctx ? this.ctx.currentTime + .22 : 0) {
    const s = this.seq, c = this.ctx; if (!s || !c || (c.state !== 'running' && !this.offline)) return;
    if (!this.offline && s.base + (s.ev[s.i]?.t ?? 0) * s.spb < c.currentTime - .4) s.base = c.currentTime + .05 - (s.ev[s.i]?.t ?? 0) * s.spb; // 止まっていた分は捨てる
    for (;;) {
      if (s.i >= s.ev.length) { s.base += (s.data.length - s.data.loopStart) * s.spb; s.i = s.loopIdx; }
      const x = s.ev[s.i], t = s.base + x.t * s.spb;
      if (t >= until) break;
      s.i++;
      if (x.drum) this.drum(x.drum.k, t, x.drum.v, s.dr);
      else if (x.mark) this.pulses.push({t, mark: x.mark});
      else if (x.beat) this.pulses.push({t, s: x.beat});
      else this.note(x.inst, x.e.m, t, x.e.d * s.spb, x.e.v, s.outs[x.tr]);
    }
    if (this.pulses.length > 64) this.pulses.splice(0, this.pulses.length - 48);
  }
  // いまの拍の強さ（1 → 0 に減衰）。描画が拍に合わせて脈打つのに使う
  pulse() {
    const c = this.ctx; if (!c || !this.seq || c.state !== 'running') return 0;
    const now = c.currentTime; let v = 0;
    for (const p of this.pulses) {
      if (p.t > now) break;
      if (p.mark) this.section = p.mark; else v = Math.max(v, p.s * Math.exp(-(now - p.t) * 7));
    }
    return v;
  }
  spectrum() { if (!this.analyser) return null; this.analyser.getByteFrequencyData(this.spec); return this.spec; }

  drum(k, t, v, out) {
    const c = this.ctx, buf = this.drums[k]; if (!buf) return;
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = (DRUM_VOL[k] || .3) * v;
    s.connect(g); g.connect(out); s.start(t);
  }
  note(inst, m, t, dur, vel, out) { (this[`i_${inst}`] || this.i_piano).call(this, hz(m), t, dur, vel, out, m); }

  // ---------- 楽器 ----------
  osc(type, f, t, stop, detune = 0) {
    const o = this.ctx.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.value = f; if (detune) o.detune.value = detune; o.start(t); o.stop(stop); return o;
  }
  amp(t, a, peak, out) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.connect(out); return g; }
  lowpass(f, q = .7) { const b = this.ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.Q.value = q; return b; }
  // 音の途中からかかるビブラート
  vibrato(t, end, rate, cents, delay, ...targets) {
    const c = this.ctx, l = this.osc('sine', rate, t, end), g = c.createGain();
    g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(cents, t + delay + .22);
    l.connect(g); for (const o of targets) g.connect(o.detune);
  }
  // 持続する旋律楽器の共通形：鋸波2本 → フィルタ → 音量
  sustained(f, t, dur, vel, out, {wave = 'sawtooth', det = 6, att = .015, rel = .05, cut = 2400, cutEnv = 0, q = 1, vib = 9, vibDelay = .16, vibRate = 5.7, scoop = 0, vol = .2, sus = .8}) {
    const end = t + dur + rel * 5 + .05, flt = this.lowpass(cut, q), g = this.amp(t, att, vol * vel, out);
    g.gain.setTargetAtTime(vol * vel * sus, t + att, .12); g.gain.setTargetAtTime(0, t + dur, rel);
    if (cutEnv) { flt.frequency.setValueAtTime(cut * .35, t); flt.frequency.linearRampToValueAtTime(cut + cutEnv * vel, t + .035); flt.frequency.setTargetAtTime(cut, t + .05, .2); }
    flt.connect(g);
    const os = (det ? [-det, det] : [0]).map(d => { const o = this.osc(wave, f, t, end, d); o.connect(flt); return o; });
    if (scoop) for (const o of os) { const d = o.detune.value; o.detune.setValueAtTime(d - scoop, t); o.detune.linearRampToValueAtTime(d, t + .04); }
    if (vib && dur > vibDelay + .08) this.vibrato(t, end, vibRate, vib, vibDelay, ...os);
  }
  i_trumpet(f, t, dur, vel, out) { this.sustained(f, t, dur, vel, out, {wave: this.waves.brass, det: 5, att: .014, rel: .04, cut: Math.min(7500, 1300 + f * 2.4), cutEnv: 2600, q: 1.5, vib: 10, vibDelay: .17, scoop: 38, vol: .2}); }
  i_violin(f, t, dur, vel, out) { this.sustained(f, t, dur, vel, out, {det: 8, att: .06, rel: .1, cut: Math.min(6500, 1700 + f * 2), q: .8, vib: 15, vibDelay: .1, vibRate: 5.4, vol: .17, sus: .92}); }
  i_flute(f, t, dur, vel, out) { this.sustained(f, t, dur, vel, out, {wave: this.waves.flute, det: 0, att: .045, rel: .07, cut: 6000, vib: 9, vibDelay: .12, vibRate: 5, vol: .42, sus: .9}); }
  i_organ(f, t, dur, vel, out) { this.sustained(f, t, dur, vel, out, {wave: this.waves.organ, det: 4, att: .02, rel: .07, cut: 5200, vib: 0, vol: .15, sus: 1}); }
  i_strings(f, t, dur, vel, out) { this.sustained(f, t, dur, vel, out, {det: 10, att: .2, rel: .28, cut: 1300 + f * 1.2, vib: 0, vol: .15, sus: 1}); }
  i_choir(f, t, dur, vel, out) {
    // 「アー」の母音：声の高さとは別に、決まった帯域（フォルマント）だけを通す
    const c = this.ctx, end = t + dur + 1.6, g = this.amp(t, .24, .2 * vel, out);
    g.gain.setTargetAtTime(0, t + dur, .3);
    const mix = c.createGain(); mix.gain.value = 1;
    for (const d of [-11, 11]) this.osc('sawtooth', f, t, end, d).connect(mix);
    for (const [fc, q, v] of [[720, 5, 1], [1150, 6, .7], [2700, 7, .3]]) {
      const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fc; b.Q.value = q;
      const gg = c.createGain(); gg.gain.value = v; mix.connect(b); b.connect(gg); gg.connect(g);
    }
  }
  // 叩く・はじく楽器の共通形：鋭く立ち上がって、のばしている間も自然に減っていく
  struck(f, t, dur, vel, out, {wave, tau, vol, rel = .07, cut = 0, cutTo = 0, det = 0}) {
    const end = t + dur + rel * 5 + .05, g = this.amp(t, .004, vol * vel, out);
    g.gain.setTargetAtTime(0, t + .004, tau); g.gain.setTargetAtTime(0, t + dur, rel);
    let dst = g;
    if (cut) { const flt = this.lowpass(cut); flt.frequency.setTargetAtTime(cutTo || cut * .3, t, tau * .6); flt.connect(g); dst = flt; }
    this.osc(wave, f, t, end, -det).connect(dst);
    if (det) this.osc(wave, f, t, end, det).connect(dst);
  }
  i_piano(f, t, dur, vel, out, m) { this.struck(f, t, Math.max(dur, .12), vel, out, {wave: this.waves.piano, tau: Math.max(.22, 1.5 - (m - 36) * .022), vol: .34, cut: Math.min(9000, f * 9 * (.6 + .6 * vel)), cutTo: f * 2.2, det: 2.5}); }
  i_harp(f, t, dur, vel, out, m) { this.struck(f, t, Math.max(dur, .5), vel, out, {wave: this.waves.harp, tau: Math.max(.25, .9 - (m - 48) * .012), vol: .4, rel: .2}); }
  i_harpsi(f, t, dur, vel, out) { this.struck(f, t, dur, vel, out, {wave: this.waves.harpsi, tau: .34, vol: .16, rel: .03, cut: 9000, cutTo: 2600}); }
  i_pizz(f, t, dur, vel, out) { this.struck(f, t, Math.max(dur, .3), vel, out, {wave: 'triangle', tau: .26, vol: .62, rel: .12}); this.struck(f * 2, t, .2, vel, out, {wave: 'sine', tau: .07, vol: .14}); }
  i_marimba(f, t, dur, vel, out) { this.struck(f, t, .6, vel, out, {wave: 'sine', tau: .22, vol: .5, rel: .2}); this.struck(f * 4, t, .1, vel, out, {wave: 'sine', tau: .03, vol: .12}); }
  i_musicbox(f, t, dur, vel, out) {
    this.struck(f * 2, t, Math.max(dur, 1), vel, out, {wave: 'sine', tau: .7, vol: .32, rel: .4});
    this.struck(f * 2 * 3.01, t, .3, vel, out, {wave: 'sine', tau: .09, vol: .07}); this.struck(f * 2 * 5.4, t, .1, vel, out, {wave: 'sine', tau: .025, vol: .05});
  }
  i_bell(f, t, dur, vel, out) {
    // FM：倍音の関係をずらした振動で、金属の響きを作る
    const c = this.ctx, end = t + 1.6, g = this.amp(t, .003, .3 * vel, out), car = this.osc('sine', f, t, end), mod = this.osc('sine', f * 3.5, t, end), mg = c.createGain();
    g.gain.setTargetAtTime(0, t + .003, .38);
    mg.gain.setValueAtTime(f * 2.4, t); mg.gain.setTargetAtTime(f * .15, t, .09);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g);
  }
  i_bass(f, t, dur, vel, out) {
    const end = t + dur + .2, flt = this.lowpass(260 + f * 5, 2.2), g = this.amp(t, .006, .5 * vel, out);
    flt.frequency.setTargetAtTime(160 + f * 2, t, .1);
    g.gain.setTargetAtTime(.38 * vel, t + .01, .09); g.gain.setTargetAtTime(0, t + dur, .03);
    flt.connect(g); this.osc('sawtooth', f, t, end).connect(flt);
    const sub = this.osc('sine', f, t, end), sg = this.ctx.createGain(); sg.gain.value = .9; sub.connect(sg); sg.connect(g);
  }

  // ---------- 効果音 ----------
  env(g, t, a, peak, d) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + d); }
  tone(f, t, dur, vol, type = 'sine', end = 0, out = this.sfxBus) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f, t); if (end) o.frequency.exponentialRampToValueAtTime(end, t + dur);
    this.env(g, t, .003, vol, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .02);
  }
  noiseHit(t, dur, vol, type, freq, out = this.sfxBus, q = 1, endFreq = 0) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  chime(notes, t, step, dur, vol, type = 'sine', wet = true) {
    notes.forEach((f, i) => { this.tone(f, t + i * step, dur, vol, type); if (wet) this.tone(f, t + i * step, dur, vol * .7, type, 0, this.sfxRev); });
  }
  sfx(name) {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    const c = this.ctx, t = c.currentTime, gap = {tan: .045, graze: .03, star: .03, item: .04, shot: .07, hitBoss: .06, hitLow: .06, hitEnemy: .06, note: .08, bubble: .08, pop: .05, page: .1, dash: .1}[name] || 0;
    if (gap && t - (this.last[name] || 0) < gap) return;
    this.last[name] = t;
    const o = this.sfxBus;
    switch (name) {
      case 'shot': this.noiseHit(t, .03, .045, 'highpass', 4200); break;
      case 'tan': this.tone(1100, t, .05, .055, 'sine', 420); this.noiseHit(t, .02, .028, 'highpass', 5000); break;
      case 'graze': this.noiseHit(t, .05, .11, 'highpass', 6500); this.tone(2400, t, .03, .025, 'sine', 3200); break;
      case 'hitBoss': this.noiseHit(t, .03, .055, 'bandpass', 2600, o, 2); break;
      case 'hitLow': this.noiseHit(t, .035, .085, 'bandpass', 4200, o, 3); this.tone(1800, t, .03, .028, 'square'); break;
      case 'hitEnemy': this.noiseHit(t, .03, .05, 'bandpass', 1800, o, 2); break;
      case 'enemyDown': this.noiseHit(t, .22, .15, 'bandpass', 900, o, .7); this.tone(520, t, .18, .06, 'triangle', 90); this.tone(1568, t, .12, .03, 'sine', 2093, this.sfxRev); break;
      case 'item': this.tone(1320, t, .05, .04, 'sine', 1760); break;
      case 'star': this.tone(2200, t, .03, .018, 'sine', 2600); break;
      case 'hit': this.tone(1700, t, .09, .14, 'square', 700); this.noiseHit(t, .12, .16, 'highpass', 3000); break;
      case 'death':
        this.tone(1250, t, .07, .12, 'square'); this.tone(1000, t + .07, .5, .14, 'sawtooth', 50);
        this.noiseHit(t + .05, .6, .22, 'lowpass', 2400); break;
      case 'bomb':
        this.noiseHit(t, 1.5, .3, 'lowpass', 400, o, 1, 5200); this.tone(90, t, 1, .3, 'sine', 32);
        this.chime([523, 659, 784, 1047, 1319, 1568], t, .045, .9, .05, 'triangle'); break;
      case 'stop':
        // 時が止まる：音が吸い込まれるように下がり、振り子が一度だけ鳴る
        this.tone(1760, t, .5, .1, 'sine', 110); this.tone(880, t, .5, .07, 'triangle', 55); this.noiseHit(t, .5, .16, 'bandpass', 6000, o, 1, 200);
        this.tone(2600, t + .5, .03, .09, 'square'); this.noiseHit(t + .5, .03, .2, 'highpass', 3800); this.tone(330, t + .5, 2, .09, 'sine', 0, this.sfxRev); break;
      case 'stopEnd': this.tone(110, t, .4, .08, 'triangle', 1760); this.noiseHit(t, .4, .14, 'bandpass', 300, o, 1, 6000); this.chime([1047, 1319, 1568, 2093], t + .3, .04, .5, .05); break;
      case 'deathbomb': this.chime([1568, 2093, 2637], t, .04, .35, .07, 'sine', false); break;
      case 'fortissimo':
        // 共鳴ゲージ満タン：長三和音が駆け上がり、ティンパニが打つ
        this.chime([392, 494, 587, 784, 988, 1175, 1568, 1976], t, .035, .9, .06, 'triangle');
        this.tone(98, t, .9, .3, 'sine', 62); this.noiseHit(t, .8, .12, 'highpass', 3000, o, 1, 9000); break;
      case 'fortEnd': this.chime([1568, 1175, 784], t, .06, .3, .04, 'sine', false); break;
      case 'guard': this.noiseHit(t, .5, .25, 'highpass', 2500); this.chime([2093, 1568, 1319, 1047, 784], t, .03, .5, .08, 'triangle'); this.tone(196, t, .5, .15, 'sine', 98); break;
      case 'spell':
        this.tone(180, t, .7, .12, 'sawtooth', 1400); this.noiseHit(t, .8, .1, 'bandpass', 500, o, .5, 4000);
        this.chime([880, 1109, 1319, 1760], t + .45, .06, .9, .045); break;
      case 'capture': this.chime([1047, 1319, 1568, 2093, 2637], t, .07, .8, .07); break;
      case 'fail': this.tone(660, t, .2, .07, 'triangle', 600); this.tone(494, t + .18, .35, .07, 'triangle', 440); break;
      case 'extend': this.chime([784, 988, 1175, 1568, 1976, 2349], t, .06, .5, .07, 'square', false); break;
      case 'powerUp': this.chime([659, 880, 1319], t, .05, .25, .06, 'triangle', false); break;
      case 'tick': this.noiseHit(t, .025, .2, 'highpass', 3800); this.tone(2600, t, .02, .05, 'square'); break;
      case 'chime': [330, 660, 990, 1320].forEach((f, i) => this.tone(f, t, 2.2 - i * .3, .08 / (i + 1), 'sine', 0, this.sfxRev)); this.tone(330, t, 1.6, .07); break;
      case 'countdown': this.tone(1320, t, .08, .07, 'square'); break;
      case 'countdownLast': this.tone(1760, t, .12, .09, 'square'); break;
      case 'split': this.tone(2600, t, .15, .05, 'sine', 3900); this.tone(1950, t, .2, .04, 'triangle'); break;
      case 'bloom': this.chime([1568, 1976, 2349], t, .025, .35, .03); this.noiseHit(t, .15, .05, 'highpass', 4000); break;
      case 'orbit': this.tone(440, t, .6, .055, 'sine', 880); this.tone(660, t + .05, .5, .03, 'triangle', 1320); break;
      case 'meteor': this.noiseHit(t, .4, .075, 'bandpass', 3200, o, .6, 900); this.tone(2400, t, .35, .028, 'sine', 900); break;
      case 'laserWarn': this.tone(220, t, .5, .05, 'sawtooth', 440); break;
      case 'bubble': this.tone(300, t, .09, .06, 'sine', 900); break;
      case 'pop': this.tone(900, t, .04, .06, 'sine', 1800); this.noiseHit(t, .03, .06, 'highpass', 5000); break;
      case 'wave': this.noiseHit(t, .7, .09, 'lowpass', 500, o, .7, 2400); break;
      case 'whirl': this.noiseHit(t, 1.6, .1, 'bandpass', 300, o, 2, 1800); this.tone(110, t, 1.4, .08, 'sine', 220); break;
      case 'page': this.noiseHit(t, .09, .09, 'bandpass', 3500, o, 1.5, 1200); break;
      case 'note': this.tone([1047, 1175, 1319, 1568, 1760][Math.floor(Math.random() * 5)], t, .22, .05, 'triangle'); break;
      case 'dash': this.noiseHit(t, .18, .08, 'bandpass', 1200, o, 2, 4000); break;
      case 'movement': this.chime([587, 740, 880, 1175, 1480, 1760], t, .05, 1.2, .06, 'triangle'); this.noiseHit(t, 1.2, .15, 'highpass', 2000, o, 1, 8000); break;
      case 'bossDown':
        this.noiseHit(t, 2.2, .35, 'lowpass', 1800); this.tone(70, t, 1.6, .35, 'sine', 25);
        this.chime([392, 523, 659, 784, 1047], t + .3, .09, 1.2, .05, 'triangle'); break;
      case 'select': this.tone(1760, t, .04, .04, 'square'); break;
      case 'confirm': this.tone(1320, t, .06, .06, 'square'); this.tone(1980, t + .05, .1, .05, 'square'); break;
      case 'cancel': this.tone(880, t, .08, .05, 'square', 600); break;
      case 'pause': this.tone(988, t, .08, .06, 'triangle'); this.tone(740, t + .08, .12, .05, 'triangle'); break;
    }
  }
}
