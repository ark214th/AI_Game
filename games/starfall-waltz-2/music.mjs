// 楽曲の記法（MML）と、曲データを「いつ・どの音を鳴らすか」の一覧に変換する処理。音は鳴らさない（audio.mjs が鳴らす）
//
// MML:  c d e f g a b（+ / # で半音上、- で半音下）  r 休符   o4 オクターブ   > < オクターブ上下
//       l8 既定の長さ   c4. 付点   c4^8 のばす   (ceg)2 和音   [ ... ]3 くり返し   | 小節線（位置を検査する）
//       v1〜v9 強さ   q1〜q8 音の長さの割合（8 でレガート）
// 長さは「全音符 = 4拍」を割る数。3/4 と 6/8 はどちらも1小節 = 3拍として扱う。

const NOTE = {c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11};
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const noteName = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

function expandRepeats(src) {
  let s = src, prev;
  do { prev = s; s = s.replace(/\[([^\[\]]*)\](\d+)/g, (_, body, n) => (body + ' ').repeat(Number(n))); } while (s !== prev);
  return s;
}

// MML → {notes: [{t, d, m, v}], len, barErrors}。t・d は拍
export function parseMML(src, bar = 4) {
  const s = expandRepeats(src), notes = [], barErrors = [];
  let i = 0, t = 0, oct = 4, defLen = 8, vel = .8, gate = .92, last = null, bars = 0;
  const num = () => { let j = i; while (j < s.length && s[j] >= '0' && s[j] <= '9') j++; const v = j > i ? Number(s.slice(i, j)) : null; i = j; return v; };
  const length = () => {
    const n = num(); let beats = 4 / (n || defLen), add = beats;
    while (s[i] === '.') { add /= 2; beats += add; i++; }
    return beats;
  };
  const pitch = () => {
    let m = NOTE[s[i++]] + 12 * (oct + 1);
    while (s[i] === '+' || s[i] === '#') { m++; i++; }
    while (s[i] === '-') { m--; i++; }
    return m;
  };
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\n' || c === '\t') { i++; continue; }
    if (c in NOTE) {
      const m = pitch(), d = length();
      last = [{t, d: d * gate, m, v: vel, full: d}]; notes.push(last[0]); t += d;
    } else if (c === '(') {
      i++; const ms = [];
      while (s[i] !== ')') {
        if (s[i] === '>') { oct++; i++; } else if (s[i] === '<') { oct--; i++; } else if (s[i] in NOTE) ms.push(pitch()); else if (s[i] === ' ') i++; else throw new Error(`MML: 和音の中の '${s[i]}'`);
      }
      i++; const d = length();
      last = ms.map(m => ({t, d: d * gate, m, v: vel, full: d})); notes.push(...last); t += d;
    } else if (c === 'r') { i++; t += length(); last = null; }
    else if (c === '^') { i++; const d = length(); if (last) for (const n of last) { n.full += d; n.d = n.full * gate; } t += d; }
    else if (c === 'o') { i++; oct = num(); }
    else if (c === '>') { i++; oct++; }
    else if (c === '<') { i++; oct--; }
    else if (c === 'l') { i++; defLen = num(); }
    else if (c === 'v') { i++; vel = num() / 9; }
    else if (c === 'q') { i++; gate = Math.min(1, num() / 8 + .02); }
    else if (c === '|') { i++; bars++; if (Math.abs(t / bar - Math.round(t / bar)) > 1e-6) barErrors.push(`小節線 ${bars} 本目が ${t} 拍の位置にある`); }
    else throw new Error(`MML: 解釈できない文字 '${c}'（${i} 文字目: …${s.slice(Math.max(0, i - 12), i + 6)}…）`);
  }
  return {notes, len: t, barErrors};
}

// コード名 → {root, bass, tones}（root・bass はピッチクラス、tones はルートからの半音）
const QUALITIES = {
  '': [0, 4, 7], m: [0, 3, 7], '7sus4': [0, 5, 7, 10], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], dim: [0, 3, 6], dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10], sus4: [0, 5, 7], sus2: [0, 2, 7], aug: [0, 4, 8], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], 5: [0, 7],
};
const pc = (l, acc) => (NOTE[l.toLowerCase()] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12;
export function parseChord(name) {
  const m = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/.exec(name);
  if (!m || !(m[3] in QUALITIES)) throw new Error(`コード名 '${name}' を解釈できない`);
  const root = pc(m[1], m[2]);
  return {name, root, bass: m[4] ? pc(m[4], m[5]) : root, tones: QUALITIES[m[3]]};
}
// "Em C,D B7" → 小節ごとのコード割り。1小節に複数あるときは , で等分
export function parseChords(str, bar) {
  const segs = []; let t = 0;
  for (const b of str.trim().split(/\s+/)) {
    const parts = b.split(',');
    parts.forEach((p, k) => segs.push({t: t + k * bar / parts.length, len: bar / parts.length, ...parseChord(p)}));
    t += bar;
  }
  return segs;
}

// ---- 伴奏の型 ----  step: 1音の長さ（拍）  seq: 小節内の並び（null は休み）  len: 音の長さの割合
// ベースは「ルートからの半音」、鍵盤は「和音の何番目の音か」（3和音なら 3 で1オクターブ上）
const BASS = {
  hold: {step: 'bar', seq: [0], len: .96},
  waltz: {step: 1, seq: [0, null, null], len: .9},
  waltz2: {step: 1, seq: [0, null, 7], len: .8},
  two: {step: 2, seq: [0, 7], len: .9},
  quarter: {step: 1, seq: [0, 0, 7, 0], len: .8},
  eight: {step: .5, seq: [0, 12, 0, 12, 0, 12, 0, 12], len: .7},
  drive: {step: .5, seq: [0, 0, 12, 0, 0, 12, 0, 7], len: .75},
  gallop: {step: .25, seq: [0, null, 0, 0, 0, null, 0, 0, 0, null, 0, 0, 0, null, 12, 0], len: .8},
  six8: {step: 1.5, seq: [0, 7], len: .92},
  tarantella: {step: .5, seq: [0, 12, 7, 0, 12, 7], len: .7},
  waltz8: {step: .5, seq: [0, null, 7, null, 12, 7], len: .8},
};
const KEYS = {
  waltz: {step: 1, seq: [null, 'c', 'c'], len: .45},
  waltzlong: {step: 1, seq: [null, 'c', 'c'], len: .9},
  block: {step: 'bar', seq: ['c'], len: .97},
  half: {step: 2, seq: ['c', 'c'], len: .95},
  stab: {step: .5, seq: [null, 'c', null, 'c', null, 'c', null, 'c'], len: .5},
  pulse: {step: .5, seq: ['c', 'c', 'c', 'c', 'c', 'c', 'c', 'c'], len: .55},
  arp8: {step: .5, seq: [0, 1, 2, 3, 2, 1, 2, 3], len: 1.6},
  arp8w: {step: .5, seq: [0, 2, 3, 4, 3, 2], len: 1.8},
  arp16: {step: .25, seq: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 4, 3, 2, 1], len: 1.5},
  arp16w: {step: .25, seq: [0, 2, 3, 2, 4, 2, 3, 2, 0, 2, 3, 2, 5, 3, 4, 2], len: 1.5},
  arp16d: {step: .25, seq: [5, 4, 3, 2, 4, 3, 2, 1, 3, 2, 1, 0, 2, 1, 2, 3], len: 1.4},
  weave: {step: .25, seq: [0, 3, 1, 4, 2, 5, 1, 4, 0, 3, 1, 4, 2, 5, 3, 4], len: 1.3},
  broken68: {step: .5, seq: [0, 2, 3, 4, 3, 2], len: 2},
  ripple68: {step: .25, seq: [0, 2, 3, 4, 5, 4, 3, 2, 3, 4, 3, 2], len: 1.6},
  tarantella: {step: .5, seq: ['c', null, 'c', 'c', null, 'c'], len: .5},
};
// 太鼓の型。文字列の長さで1小節を等分する。x 強 / o 弱 / . 休み
// k キック  s スネア  h ハット  O 開いたハット  r ライド（トライアングル）  t タム  T ティンパニ  b タンバリン
export const DRUMS = {
  // 4/4
  rock: {k: 'x.......x.x.....', s: '....x.......x...', h: 'x.o.x.o.x.o.x.o.'},
  rock2: {k: 'x..x..x...x.x...', s: '....x.......x..o', h: 'x.x.x.x.x.x.x.x.'},
  drive: {k: 'x...x...x...x...', s: '....x.......x...', h: 'o.x.o.x.o.x.o.x.', O: '..............x.'},
  fast: {k: 'x.x...x.x.x...x.', s: '....x.......x...', h: 'xoxoxoxoxoxoxoxo'},
  gallop: {k: 'x..xx..xx..xx..x', s: '....x.......x...', h: 'x.o.x.o.x.o.x.o.'},
  half: {k: 'x.........x.....', s: '........x.......', h: 'x...o...x...o...'},
  light: {h: 'x.o.x.o.x.o.x.o.', k: 'x.......x.......'},
  march: {k: 'x...x...x...x...', s: 'o.oox.oxo.oox.xx', h: '................'},
  fill4: {k: 'x.......x.......', s: 'x.x.xx..', t: '....x.xx....xxxx', h: 'x...............'},
  build4: {s: 'x.x.x.x.xxxxxxxx', k: 'x...x...x...x...'},
  // 3/4（12分割）
  waltz: {k: 'x...........', r: '....x...x...', h: '............'},
  waltzb: {k: 'x...........', s: '....o...o...', b: '....x...x...'},
  waltzd: {k: 'x.....x.....', s: '....x...x...', h: 'x.o.x.o.x.o.'},
  waltzf: {k: 'x.....x...x.', s: '....x...x...', h: 'xoxoxoxoxoxo'},
  fill3: {k: 'x...........', s: '....x.x.xxxx', t: '..x.........'},
  timp3: {T: 'x.......o...', r: '....x...x...'},
  // 6/8（6分割・12分割）
  six: {k: 'x.....', h: 'xoxxox', s: '...o..'},
  sixd: {k: 'x....xx.....', s: '......x.....', h: 'x.x.x.x.x.x.'},
  tar: {k: 'x.....x.....', s: '......x.....', b: 'x.x.x.x.x.x.', h: '....x.....x.'},
  tarf: {k: 'x...x.x...x.', s: '......x....o', b: 'x.x.x.x.x.x.', h: 'xoxoxoxoxoxo'},
  fill6: {k: 'x.....', s: '...xxx', t: 'xxx...'},
};

const voiced = (ch, base) => ch.tones.map(o => base + ((ch.root + o - base) % 12 + 12) % 12).sort((a, b) => a - b);
const tone = (ch, base, i) => {
  const v = voiced(ch, base), n = v.length;
  return v[((i % n) + n) % n] + 12 * Math.floor(i / n);
};
const chordAt = (segs, t) => { let c = segs[0]; for (const s of segs) if (s.t <= t + 1e-9) c = s; else break; return c; };

// 曲 → 実際に鳴らす音の一覧。tracks[name] = [{t, d, m, v, inst?}]、drums = [{t, k, v}]、beats = [{t, bar}]
export function compileSong(song) {
  const bar = song.bar || 4, out = {id: song.id, bpm: song.bpm, bar, tracks: {}, drums: [], marks: [], errors: []};
  for (const name of Object.keys(song.tracks)) out.tracks[name] = [];
  let T = 0;
  song.order.forEach((secName, oi) => {
    const sec = song.sections[secName];
    if (!sec) throw new Error(`${song.id}: セクション ${secName} がない`);
    const len = sec.bars * bar, segs = parseChords(sec.chords, bar), comp = sec.comp || {}, tr = sec.tr || 0;
    if (segs[segs.length - 1].t + segs[segs.length - 1].len !== len) out.errors.push(`${song.id}/${secName}: コードが ${sec.bars} 小節ぶんない`);
    if (oi === (song.loop || 0)) out.loopStart = T;
    out.marks.push({t: T, name: secName, segs: segs.map(s => ({...s, t: s.t + T}))});
    const push = (name, t, d, m, v, inst) => {
      if (!out.tracks[name]) throw new Error(`${song.id}/${secName}: トラック ${name} がない`);
      out.tracks[name].push({t: T + t, d, m: m + tr, v, ...(inst ? {inst} : {})});
    };
    const insts = sec.inst || {};
    // 手書きのパート
    for (const name of Object.keys(song.tracks)) {
      if (typeof sec[name] !== 'string') continue;
      const p = parseMML(sec[name], bar);
      for (const e of p.barErrors) out.errors.push(`${song.id}/${secName}/${name}: ${e}`);
      if (Math.abs(p.len - len) > 1e-6) out.errors.push(`${song.id}/${secName}/${name}: 長さ ${p.len} 拍（${sec.bars} 小節 = ${len} 拍のはず）`);
      for (const n of p.notes) push(name, n.t, n.d, n.m, n.v, insts[name]);
      // 主旋律の下に、その時のコードの音でハモりをつける
      if (name === 'lead' && comp.harm && out.tracks.harm) for (const n of p.notes) {
        if (n.full < .5) continue;
        const ch = chordAt(segs, n.t), pcs = ch.tones.map(o => (ch.root + o) % 12);
        for (let m = n.m - 3; m >= n.m - 9; m--) if (pcs.includes(((m % 12) + 12) % 12)) { push('harm', n.t, n.d, m, n.v * .8, insts.harm); break; }
      }
    }
    // コードから作る伴奏
    const steps = (pat, fn) => {
      const st = pat.step === 'bar' ? bar : pat.step, perBar = Math.round(bar / st);
      for (let k = 0; k * st < len - 1e-9; k++) { const x = pat.seq[(k % perBar) % pat.seq.length]; if (x !== null && x !== undefined) fn(k * st, st * pat.len, x, k % perBar === 0); }
    };
    if (comp.bass && typeof sec.bass !== 'string') {
      const pat = BASS[comp.bass]; if (!pat) throw new Error(`ベースの型 ${comp.bass} がない`);
      const base = song.tracks.bass.oct ?? 2;
      steps(pat, (t, d, off, first) => { const ch = chordAt(segs, t), root = 12 * (base + 1) + (first || off === 0 ? ch.bass : ch.root); push('bass', t, d, (root < 12 * (base + 1) + 4 ? root + 12 : root) + (off === 0 ? 0 : off), first ? .95 : .78); });
    }
    for (const part of ['keys', 'arp']) {
      if (!comp[part] || typeof sec[part] === 'string') continue;
      const pat = KEYS[comp[part]]; if (!pat) throw new Error(`鍵盤の型 ${comp[part]} がない`);
      const base = 12 * ((song.tracks[part].oct ?? 4) + 1);
      steps(pat, (t, d, x, first) => {
        const ch = chordAt(segs, t);
        if (x === 'c') for (const m of voiced(ch, base)) push(part, t, d, m, first ? .8 : .66, insts[part]);
        else push(part, t, d, tone(ch, base, x), first ? .85 : .68, insts[part]);
      });
    }
    if (comp.pad && typeof sec.pad !== 'string') {
      const base = 12 * ((song.tracks.pad.oct ?? 3) + 1) + 7;
      for (const s of segs) for (const m of voiced(s, base)) push('pad', s.t, s.len * .98, m, .7, insts.pad);
    }
    // 太鼓。fill を指定すると最後の小節だけ差し替える
    if (comp.drums) for (let b = 0; b < sec.bars; b++) {
      const patName = sec.fill && b === sec.bars - 1 ? sec.fill : comp.drums, pat = DRUMS[patName];
      if (!pat) throw new Error(`太鼓の型 ${patName} がない`);
      for (const [k, str] of Object.entries(pat)) for (let i = 0; i < str.length; i++)
        if (str[i] !== '.') out.drums.push({t: T + b * bar + i * bar / str.length, k, v: str[i] === 'x' ? 1 : .5});
    }
    if (sec.crash) out.drums.push({t: T, k: 'c', v: 1});
    if (sec.timp) out.drums.push({t: T, k: 'T', v: 1});
    T += len;
  });
  out.length = T; out.loopStart ??= 0;
  for (const list of Object.values(out.tracks)) list.sort((a, b) => a.t - b.t);
  out.drums.sort((a, b) => a.t - b.t);
  return out;
}
