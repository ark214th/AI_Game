// 楽曲データ。記法は music.mjs を参照。
// tracks: パート名 → 楽器（audio.mjs の INSTRUMENTS）と音量・定位。sections: 小節数・コード進行・手書きの旋律・伴奏の型。
// order の順に演奏し、最後まで行ったら order[loop] に戻る。

// ── 共通の主題 ──────────────────────────────────────────
// 前作「星降る円舞曲」の主題（ニ短調・3拍子）。今作でもオルゴールと、セレネの曲で鳴る
const WALTZ1 = `o5 l8 d4 e f a4 | o6 d2 c <b- | o5 b-4 a g d4 | e2 c+4 |
  o5 d4 e f a4 | o6 f2 d <b- | o6 c4 <b- a g4 | a2^8 r8 |`;
const WALTZ1B = `o6 l8 c4 <a f >c4 | o6 e4 d c <g4 | o5 f4 a >d f4 | o6 e4 c+ <a e4 |
  o6 d4 f4 d <b- | o5 g4 b- >d g4 | o6 e4 d c+ e4 | o6 d2^8 r8 |`;
const WALTZ1C = `o5 l8 g b- >d4 g4 | o6 e4 g4 c4 | o6 f4 a4 c4 | o6 d4 f4 b-4 |
  o6 g4 f4 d <b- | o6 c+4 e4 a4 | o6 f4 e d <a f | o5 e4 c+4 <a4 |`;
// 今作の主題「第二夜」（ニ短調）と、その中間部（ヘ長調）、夜明けの長調版
const NIGHT2 = `o4 l8 a4 >d4 f4 | f4. e d4 | e4 g4 >c4 | c4. <b- a4 |
  o5 b-4 a4 g4 | a4 f4 d4 | e4 g4 b-4 | a2 >c+4 |
  o6 d4 <a4 f4 | d4 f4 b-4 | >c4 <b-4 g4 | a2 f4 |
  g4 b-4 >d4 | c+4 e4 <a4 | >d2. | d2 r4 |`;
const NIGHT2_CH = 'Dm Bb C F Gm Dm Em7b5 A7 Dm Bb C F Gm A7 Dm Dm';
const NIGHT2B = `o5 l8 c4 f4 a4 | g4. f e4 | f4 a4 >d4 | c4 <a4 e4 |
  d4 f4 b-4 | a4. g f4 | g4 b-4 >d4 | c2 <b-4 |
  a4 >c4 f4 | e4. d c4 | d4 <a4 f4 | e4 a4 >c4 |
  d4. c <b-4 | g4 b-4 >d4 | d2 e4 | c+2. |`;
const NIGHT2B_CH = 'F C/E Dm Am Bb F/A Gm C7 F C/E Dm Am Bb Gm A7sus4 A7';
const DAWN = `o4 l8 a4 >d4 f+4 | g4. f+ d4 | e4 a4 >c+4 | d4. c+ <a4 |
  o5 b4 a4 g4 | a4 f+4 d4 | e4 g+4 b4 | a2 >c+4 |
  o6 d4 <a4 f+4 | d4 g4 b4 | >c+4 <b4 a4 | a2 f+4 |
  g4 b4 >e4 | c+4 e4 <a4 | >d2. | d2 r4 |`;
const DAWN_CH = 'D G A D Em D/F# E7 A7 D G A D Em A7 D D';

export const SONGS = {
  // ── タイトル ──────────────────────────────────────────
  title: {
    title: '星降る円舞曲 第二夜', en: 'Starfall Waltz — Second Night', bpm: 138, bar: 3,
    comment: 'タイトル曲。はじめの8小節は前作の主題をオルゴールでそのまま。蓋を閉じるように終わって、弦が新しい主題を弾きはじめます。「次の夜も、踊ってくれる？」への返事のつもりで。',
    tracks: {
      lead: {inst: 'violin', vol: .78, rev: .4}, harm: {inst: 'violin', vol: .4, pan: .25, rev: .4},
      keys: {inst: 'piano', vol: .36, pan: -.2, oct: 4}, arp: {inst: 'harp', vol: .34, pan: .3, oct: 4},
      pad: {inst: 'strings', vol: .34, oct: 3}, bass: {inst: 'pizz', vol: .7, oct: 2},
    },
    sections: {
      intro: {bars: 8, chords: 'Dm Bb Gm A Dm Bb C A', inst: {lead: 'musicbox'}, comp: {arp: 'arp8w'}, lead: WALTZ1},
      A: {bars: 16, chords: NIGHT2_CH, comp: {bass: 'waltz', keys: 'waltz', pad: 1, drums: 'waltz'}, lead: NIGHT2},
      B: {bars: 16, chords: NIGHT2B_CH, inst: {lead: 'flute'}, comp: {bass: 'waltz2', keys: 'waltz', arp: 'arp8w', pad: 1, drums: 'waltzb'}, lead: NIGHT2B},
      A2: {bars: 16, chords: NIGHT2_CH, comp: {bass: 'waltz2', keys: 'waltz', arp: 'arp8w', pad: 1, drums: 'waltzb', harm: 1}, crash: 1, lead: NIGHT2},
    },
    order: ['intro', 'A', 'B', 'A2'], loop: 1,
  },

  // ── 1面 ──────────────────────────────────────────
  stage1: {
    title: '極光のプロムナード', en: 'Aurora Promenade', bpm: 152, bar: 4,
    comment: '1面道中。凍った遊歩道を、光の幕を見上げながら歩く曲。ホ短調で始めて、サビだけト長調に抜けます。静かすぎる夜なので、足音のかわりにピアノを細かく刻ませました。',
    tracks: {
      lead: {inst: 'flute', vol: .8, rev: .3, dly: .25}, harm: {inst: 'trumpet', vol: .36, pan: .2},
      counter: {inst: 'bell', vol: .4, pan: .35, rev: .5}, keys: {inst: 'piano', vol: .34, pan: -.25, oct: 4},
      arp: {inst: 'harp', vol: .3, pan: .3, oct: 5}, pad: {inst: 'strings', vol: .3, oct: 3}, bass: {inst: 'bass', vol: .62, oct: 2},
    },
    sections: {
      intro: {bars: 4, chords: 'Em C D Bsus4,B', comp: {arp: 'arp16', pad: 1, drums: 'light'},
        counter: 'o5 l8 b4 >e4 d4 <b4 | >c4 e4 d4 <g4 | a4 >d4 c4 <a4 | b2 >d+2 |', fill: 'fill4'},
      A: {bars: 8, chords: 'Em C D G Em C D B7', comp: {bass: 'eight', keys: 'stab', pad: 1, drums: 'rock'},
        lead: `o5 l8 e4 g b4 a g f+ | e4 g4 >c4. <b | a4 f+ a4 >d <a f+ | g2 b4 >d4 |
          o6 e4 d <b4 >e d <b | o6 c4 <b g4 >c <b g | o5 a4 f+ d4 f+ a >d | o5 b4 a f+4 d+4. |`},
      B: {bars: 8, chords: 'C D Bm Em Am D Bsus4 B', inst: {lead: 'trumpet'}, comp: {bass: 'drive', keys: 'pulse', pad: 1, drums: 'rock2'}, fill: 'fill4',
        lead: `o5 l8 g4. e g4 >c4 | o5 a4. f+ a4 >d4 | o6 d4 c+ <b4 f+ b >d | o6 e2 <b4 g4 |
          o5 a4 >c e4 c <a >c | o6 d4 f+ a4 f+ d f+ | o6 e2 f+2 | o6 d+2. r4 |`},
      C1: {bars: 8, chords: 'C D Bm Em C D G G', inst: {lead: 'trumpet'}, comp: {bass: 'drive', keys: 'arp16', arp: 'arp8', pad: 1, drums: 'drive', harm: 1}, crash: 1,
        lead: `o6 l8 e4 d c4 <g4. | o6 f+4 e d4 <a4. | o6 d4 <b >f+4 d <b >d | o6 e4. g e4 <b4 |
          o6 c4 e g4 e c e | o6 d4 f+ a4 f+ d <a | o5 b4 >d g2^8 | o6 g4 f+ d4 <b4. |`},
      C2: {bars: 8, chords: 'C D Bm Em C D Em Em', inst: {lead: 'trumpet'}, comp: {bass: 'drive', keys: 'arp16', arp: 'arp8', pad: 1, drums: 'drive', harm: 1}, fill: 'fill4',
        lead: `o6 l8 e4 d c4 <g4. | o6 f+4 e d4 <a4. | o6 d4 <b >f+4 d <b >d | o6 e4. g e4 <b4 |
          o6 c4 e g4 e c e | o6 d4 f+ a4 f+ d <a | o5 b4 >e g2^8 | o6 e1 |`},
    },
    order: ['intro', 'A', 'B', 'C1', 'C2'], loop: 1,
  },
  boss1: {
    title: 'オーロラを織る少女', en: 'The Girl Who Weaves the Aurora', bpm: 164, bar: 4,
    comment: 'ルミ・ボレアリスのテーマ。ピアノの右手と左手が交互に上下して、経糸と緯糸になるように組みました。サビは一段ずつ上がっていく三回くり返し。織り上がった幕が、ぱっと広がるところです。',
    tracks: {
      lead: {inst: 'trumpet', vol: .8, rev: .25, dly: .18}, harm: {inst: 'trumpet', vol: .38, pan: .25},
      counter: {inst: 'bell', vol: .4, pan: -.3, rev: .5}, keys: {inst: 'piano', vol: .38, pan: -.2, oct: 4},
      pad: {inst: 'strings', vol: .3, oct: 3}, bass: {inst: 'bass', vol: .64, oct: 2},
    },
    sections: {
      intro: {bars: 4, chords: 'Am F G E', comp: {keys: 'weave', pad: 1, drums: 'half'}, crash: 1, fill: 'build4',
        counter: 'o5 l8 a2 >c2 | <a2 >f2 | d2 <b2 | >e1 |'},
      A: {bars: 8, chords: 'Am F G C Dm Am E7 E7', comp: {bass: 'drive', keys: 'weave', pad: 1, drums: 'fast'},
        lead: `o5 l8 a4 >c e4 d c <b | o6 c4 <a f4 a >c f | o6 d4 <b g4 b >d g | o6 e2 r c e g |
          o6 f4 e d4 <a4. | o6 e4 d c4 <a4. | o5 b4 g+ e4 g+ b >d | o6 e4 d <b4 g+4. |`},
      B: {bars: 8, chords: 'F G Em Am Dm G Esus4 E', inst: {lead: 'violin'}, comp: {bass: 'eight', keys: 'arp8', pad: 1, drums: 'half'}, fill: 'build4',
        lead: `o5 l8 a2 >c4 f4 | o6 d2 <b4 g4 | o5 g2 b4 >e4 | o6 c2. <a4 |
          o5 f4 a4 >d4 f4 | o6 g4 f4 d4 <b4 | o5 a2 b2 | o5 g+2 b4 >e4 |`},
      C: {bars: 8, chords: 'F G Am C F G E Am', comp: {bass: 'gallop', keys: 'arp16w', pad: 1, drums: 'drive', harm: 1}, crash: 1,
        lead: `o6 l16 c8 <a8 >c d e8 c8 <a8 >c8 e8 | o6 d8 <b8 >d e f8 d8 <b8 >d8 g8 | o6 e8 c8 e f g8 e8 c8 e8 a8 | o6 g4 e8 c8 e4 r8 g8 |
          o6 f8 c8 <a8 >c8 f8 c8 a8 f8 | o6 g8 d8 <b8 >d8 g8 d8 b8 g8 | o6 g+8 e8 <b8 >e8 g+8 b8 g+8 e8 | o6 a2. r4 |`},
    },
    order: ['intro', 'A', 'B', 'C', 'C'], loop: 1,
  },

  // ── 2面 ──────────────────────────────────────────
  stage2: {
    title: '潮硝子のバルカローレ', en: 'Tideglass Barcarolle', bpm: 112, bar: 3,
    comment: '2面道中。バルカローレは舟歌のこと。8分の6拍子で、波に揺られる感じを出しています。月が欠けて潮が止まっている設定なので、低音はあえて動かさず、上でハープとマリンバだけがきらきら揺れます。',
    tracks: {
      lead: {inst: 'flute', vol: .82, rev: .4, dly: .22}, harm: {inst: 'violin', vol: .34, pan: .2, rev: .4},
      counter: {inst: 'marimba', vol: .5, pan: -.3, rev: .35}, arp: {inst: 'harp', vol: .4, pan: .3, oct: 4},
      pad: {inst: 'strings', vol: .32, oct: 3}, bass: {inst: 'pizz', vol: .7, oct: 2},
    },
    sections: {
      intro: {bars: 4, chords: 'Gm Eb Bb D', comp: {arp: 'broken68', pad: 1},
        counter: 'o5 l8 d4. b-4. | g4. b-4. | f4. >d4. | <f+2. |'},
      A: {bars: 8, chords: 'Gm Eb Bb F Gm Eb Cm D', comp: {bass: 'six8', arp: 'broken68', pad: 1, drums: 'six'},
        lead: `o5 l8 d4 g b-4 a | o5 g4 e- g4. | o5 f4 b- >d4 c | o5 a4. >c4. |
          o6 d4 c <b-4 a | o5 b-4 g e-4 g | o5 g4 e- c4 e- | o5 d4. f+4. |`,
        counter: 'o4 l8 r4. g b- >d | r4. <g b- >e- | r4. <f b- >d | r4. <f a >c | r4. <g b- >d | r4. <g b- >e- | r4. <g >c e- | r4. <f+ a >d |'},
      B: {bars: 8, chords: 'Bb F/A Gm Dm Eb Bb/D Cm D', comp: {bass: 'six8', arp: 'ripple68', pad: 1, drums: 'sixd', harm: 1},
        lead: `o5 l8 f4 b- >d4 f | o6 e-4 d c4 <a | o5 b-4 >d g4 f | o6 f4. d4. |
          o6 e-4 g b-4 g | o6 f4 d <b-4 >d | o6 e-4 c <g4 >c | o5 a4 f+ d4. |`},
      A2: {bars: 8, chords: 'Gm Eb Bb F Gm Eb Cm D', inst: {lead: 'violin'}, comp: {bass: 'six8', arp: 'ripple68', pad: 1, drums: 'sixd'},
        lead: `o5 l8 d4 g b-4 a | o5 g4 e- g4. | o5 f4 b- >d4 c | o5 a4. >c4. |
          o6 d4 c <b-4 a | o5 b-4 g e-4 g | o5 g4 e- c4 e- | o5 d4. f+4. |`,
        counter: 'o5 l8 b-4. g4. | b-4. g4. | >d4. <b-4. | >c4. <a4. | b-4. g4. | >e-4. <b-4. | >c4. <g4. | a4. f+4. |'},
    },
    order: ['intro', 'A', 'B', 'A2', 'B'], loop: 1,
  },
  boss2: {
    title: '夜光虫のタランテラ', en: 'Noctiluca Tarantella', bpm: 204, bar: 3,
    comment: 'マリス・ノクティルカのテーマ。タランテラは、毒蜘蛛に噛まれた人が踊り続けるという南イタリアの急速な舞曲です。腕で海を引く彼女にはこれくらいの馬力が似合うと思って。進行は下りてくる四つの和音（アンダルシア終止）。',
    tracks: {
      lead: {inst: 'trumpet', vol: .8, rev: .22, dly: .15}, harm: {inst: 'trumpet', vol: .38, pan: .25},
      keys: {inst: 'piano', vol: .36, pan: -.25, oct: 4}, arp: {inst: 'harp', vol: .3, pan: .3, oct: 4},
      pad: {inst: 'strings', vol: .3, oct: 3}, bass: {inst: 'bass', vol: .64, oct: 2},
    },
    sections: {
      intro: {bars: 4, chords: 'Dm Dm A7 A7', comp: {drums: 'tar'}, crash: 1, fill: 'fill6',
        lead: 'o5 l8 d f a >d <a f | d f a >d <a f | c+ e a >c+ <a e | c+ e a >e c+ <a |',
        bass: 'o2 l8 d f a >d <a f | d f a >d <a f | c+ e a >c+ <a e | c+ e a >e c+ <a |'},
      A: {bars: 8, chords: 'Dm C Bb A7 Dm C Bb,A7 Dm', comp: {bass: 'tarantella', keys: 'tarantella', pad: 1, drums: 'tar'},
        lead: `o5 l8 a >d d d e f | o6 e c c c d e | o6 d <b- b- b- >c d | o6 c+ <a >e c+ <a >c+ |
          o6 f d f a f d | o6 e c e g e c | o6 d <b- >d c+ <a >c+ | o6 d4. <a4. |`},
      A2: {bars: 8, chords: 'Dm C Bb A7 Dm C Bb,A7 Dm', comp: {bass: 'tarantella', keys: 'tarantella', pad: 1, drums: 'tarf', harm: 1},
        lead: `o5 l8 a >d d d e f | o6 e c c c d e | o6 d <b- b- b- >c d | o6 c+ <a >e c+ <a >c+ |
          o6 f d f a f d | o6 e c e g e c | o6 d <b- >d c+ <a >c+ | o6 d4. r4. |`},
      B: {bars: 8, chords: 'F C Dm Am Bb F Gm A7', inst: {lead: 'violin'}, comp: {bass: 'six8', keys: 'tarantella', arp: 'broken68', pad: 1, drums: 'sixd'}, fill: 'fill6',
        lead: `o5 l8 a4 >c f4 e | o6 e4 d c4 <g | o5 a4 >d f4 e | o6 e4. c4. |
          o6 d4 f b-4 a | o6 a4 f c4 f | o6 g4 f d4 <b- | o5 a4 >c+ e4. |`},
      C: {bars: 8, chords: 'Bb C Dm F Bb C A7sus4 A7', comp: {bass: 'tarantella', keys: 'tarantella', pad: 1, drums: 'tarf', harm: 1}, crash: 1,
        lead: `o6 l8 d <b- f b- >d f | o6 e c <g >c e g | o6 f d <a >d f a | o6 a4 f c4. |
          o6 b-4 a g4 f | o6 g4 f e4 d | o6 e4 d e4 d | o6 c+ e a e c+ <a |`},
    },
    order: ['intro', 'A', 'A2', 'B', 'C', 'C'], loop: 1,
  },

  // ── 3面 ──────────────────────────────────────────
  stage3: {
    title: '彗星書庫のフーガ', en: 'Fugue of the Comet Archive', bpm: 138, bar: 4,
    comment: '3面道中。チェンバロが一人で主題を弾き、五度上でもう一人が追いかけ、低音が三人目として入る──フーガの出だしをそのまま使いました。書架のあいだを、同じ旋律が時間差で通り過ぎていくイメージです。途中からバンドが合流します。',
    tracks: {
      lead: {inst: 'harpsi', vol: .62, rev: .3}, harm: {inst: 'trumpet', vol: .36, pan: .25},
      counter: {inst: 'harpsi', vol: .5, pan: -.3, rev: .3}, keys: {inst: 'harpsi', vol: .3, pan: .3, oct: 4},
      pad: {inst: 'strings', vol: .3, oct: 3}, bass: {inst: 'bass', vol: .62, oct: 2},
    },
    sections: {
      fugue: {bars: 8, chords: 'Cm G7,Cm Gm D7,Gm Cm G7,Cm Fm,G7 Cm',
        lead: `o5 l8 c4 g4 a- g f e- | d e- f d e-4 c4 | o5 b-4 a4 g b- a g | f+ g a f+ g4 b-4 |
          o5 g2 a-4 g4 | f4 d4 e-4 g4 | o5 a- g f a- g f e- d | e-2 r2 |`,
        counter: `o4 l8 r1 | r1 | o4 g4 >d4 e- d c <b- | a b- >c <a b-4 g4 |
          o4 e-4 d4 c e- d c | <b >c d <b >c4 e-4 | o4 f4 d4 <b4 >d4 | c2 r2 |`,
        bass: `o3 l8 r1 | r1 | r1 | r1 | o3 c4 g4 a- g f e- | d e- f d e-4 c4 | o2 f4 f4 g4 g4 | >c2 r2 |`},
      A: {bars: 8, chords: 'Cm,Fm G7,Cm Ab Bb,Cm Fm C7,Fm D7 G', inst: {lead: 'trumpet'}, comp: {bass: 'quarter', keys: 'arp16', pad: 1, drums: 'rock'}, crash: 1,
        lead: `o5 l8 c4 g4 a- g f e- | d e- f d e-4 c4 | o5 a-4 >e-4 f e- d c | <b- >c d <b- >c4 <g4 |
          o5 f4 >c4 d- c <b- a- | g a- b- g a-4 f4 | o5 f+4 a4 >c4 e-4 | o6 d2 <b4 g4 |`,
        counter: `o4 l8 r1 | r1 | r2 r4 e-4 | d2 e-2 | r1 | r1 | o4 a2 >c2 | <b2 >d2 |`},
      B: {bars: 8, chords: 'Eb Bb Cm Gm Ab Eb Fm G7', inst: {lead: 'violin'}, comp: {bass: 'eight', keys: 'arp16w', pad: 1, drums: 'drive'}, fill: 'fill4',
        lead: `o5 l8 g2 b-4 >e-4 | o6 d2 <b-4 f4 | o5 e-4 g4 >c4 e-4 | o6 d2. <b-4 |
          o6 c4 e-4 a-4 g4 | o6 g4 e-4 <b-4 >e-4 | o6 f4 e- d c4 <a-4 | o5 b4 >d4 g2 |`,
        counter: `o4 l8 e-4 b-4 >c <b- a- g | f g a- f g4 d4 | r1 | r1 | o4 a-4 >e-4 f e- d c | <b- >c d <b- >c4 <g4 | r1 | r1 |`},
      C: {bars: 8, chords: 'Cm,Fm G7,Cm Ab Bb,Cm Fm,D7 G7 Cm Cm', inst: {lead: 'trumpet'}, comp: {bass: 'drive', keys: 'arp16', pad: 1, drums: 'fast', harm: 1}, crash: 1,
        lead: `o6 l8 c4 g4 a- g f e- | d e- f d e-4 c4 | o5 a-4 >e-4 f e- d c | <b- >c d <b- >c4 <g4 |
          o6 a-4 f4 f+4 a4 | o6 g4 f d <b4 >d4 | o6 e-4 d c <g4 >c4 | o6 c2. r4 |`,
        counter: `o4 l8 r2 c4 g4 | a- g f e- d e- f d | r2 a-4 >e-4 | f e- d c <b- >c d <b- | r1 | r1 | o4 c4 g4 a- g f e- | d e- f d e-4 c4 |`},
    },
    order: ['fugue', 'A', 'B', 'C'], loop: 0,
  },
  boss3: {
    title: '七十六年目のクーリエ', en: 'Courier of the Seventy-Sixth Year', bpm: 176, bar: 4,
    comment: 'ハレー・クイルのテーマ。彗星便の配達人なので、馬が駆けるリズム（タッ・タタ）で通しました。サビは伴奏だけ忙しくして、旋律はあえて長く伸ばしています。尾を引いて遠ざかっていく感じに聞こえたら成功。',
    tracks: {
      lead: {inst: 'trumpet', vol: .8, rev: .25, dly: .2}, harm: {inst: 'trumpet', vol: .38, pan: .25},
      keys: {inst: 'piano', vol: .36, pan: -.25, oct: 4}, pad: {inst: 'strings', vol: .32, oct: 3}, bass: {inst: 'bass', vol: .64, oct: 2},
    },
    sections: {
      intro: {bars: 4, chords: 'Bm Bm G A', comp: {bass: 'gallop', pad: 1, drums: 'gallop'}, crash: 1, fill: 'fill4',
        lead: 'o5 l8 b4 b >d <b >f+ e d | o5 b4 b >d <b >f+ e d | o5 g4 g b g >d c+ <b | o5 a4 a >c+ <a >e d c+ |'},
      A: {bars: 8, chords: 'Bm G A F#m G Em F# F#', comp: {bass: 'gallop', keys: 'stab', pad: 1, drums: 'gallop'},
        lead: `o5 l8 f+4. b >d4 c+ <b | o6 d4. <b g4 b >d | o6 e4. c+ <a4 >c+ e | o6 f+2 c+4 <a4 |
          o5 b4. >d g4 f+ d | o6 e4. g b4 g e | o6 f+4 e c+4 <a+4. | o6 c+4 <a+ f+4 a+ >c+ e |`},
      B: {bars: 8, chords: 'D A Bm F#m G D Em F#', inst: {lead: 'violin'}, comp: {bass: 'eight', keys: 'arp16', pad: 1, drums: 'rock2'}, fill: 'fill4',
        lead: `o5 l8 a2 >d4 f+4 | o6 e2 c+4 <a4 | o5 b4 >d4 f+4 b4 | o6 a2. f+4 |
          o6 g4 b4 g4 d4 | o6 f+4 a4 f+4 d4 | o6 e4 g4 b4 g4 | o6 f+2 a+2 |`},
      C: {bars: 8, chords: 'G A Bm Bm G A D,F# Bm', comp: {bass: 'gallop', keys: 'arp16w', pad: 1, drums: 'gallop', harm: 1}, crash: 1,
        lead: `o6 l8 d2 <b4 >d4 | o6 e2 c+4 e4 | o6 f+2. e d | o5 b2 >f+4 b4 |
          o6 b4 a4 g4 d4 | o6 a4 g4 e4 c+4 | o6 d4 f+4 e4 c+4 | o6 d c+ <b2. |`},
    },
    order: ['intro', 'A', 'B', 'C', 'C'], loop: 1,
  },

  // ── 4面 ──────────────────────────────────────────
  stage4: {
    title: '蝕の階', en: 'Stairway to the Umbra', bpm: 126, bar: 3,
    comment: '4面道中。「きざはし」と読みます。オルガンと合唱だけの暗いワルツで始めて、階段を上るごとに楽器を増やしました。旋律の頭をわざと和音から一つ外して、次の音で解決させています。まだ月が見えない、という不安の表現です。',
    tracks: {
      lead: {inst: 'violin', vol: .78, rev: .45}, harm: {inst: 'violin', vol: .38, pan: .25, rev: .45},
      keys: {inst: 'organ', vol: .3, pan: -.15, oct: 4}, arp: {inst: 'harp', vol: .3, pan: .3, oct: 4},
      pad: {inst: 'choir', vol: .36, oct: 3}, bass: {inst: 'pizz', vol: .74, oct: 2},
    },
    sections: {
      intro: {bars: 8, chords: 'Fm Fm Db Db Bbm Bbm C C', inst: {lead: 'organ'}, comp: {keys: 'block', bass: 'hold'}, timp: 1,
        lead: 'o4 l4 f2. | a-2. | f2 a-4 | >d-2. | <b-2 >d-4 | f2. | e2. | g2. |'},
      A: {bars: 16, chords: 'Fm Fm Db Db Bbm Bbm C7 C7 Fm Fm Db Eb Ab Bbm C7 Fm', comp: {bass: 'waltz', keys: 'waltzlong', pad: 1, drums: 'timp3'}, timp: 1,
        lead: `o5 l8 c4 f4 a-4 | o6 c4. <b- a-4 | o5 d-4 f4 a-4 | o6 d-4. c <a-4 |
          o5 b-4 >d-4 f4 | o6 e-4. d- <b-4 | o5 g4 b-4 >e4 | o6 c2. |
          o6 f4 c4 <a-4 | o5 f4. g a-4 | o5 a-4 >d-4 f4 | o6 e-4. f g4 |
          o6 a-4 e-4 c4 | o6 d-4 <b-4 >f4 | o6 e4 g4 b-4 | o6 a-2. |`},
      B: {bars: 16, chords: 'Ab Eb Fm C7 Db Ab Bbm C7 Ab Eb Fm C7 Db Eb Fm Fm', inst: {lead: 'trumpet'}, comp: {bass: 'waltz8', keys: 'waltz', arp: 'arp8w', pad: 1, drums: 'waltzd', harm: 1}, crash: 1,
        lead: `o5 l8 e-4 a-4 >c4 | o6 e-4 <b-4 g4 | o5 a-4 >c4 f4 | o6 e2 c4 |
          o6 f4 a-4 f4 | o6 e-4 c4 <a-4 | o5 b-4 >d-4 f4 | o6 g2 e4 |
          o6 a-4 g f e-4 | o6 g4 f e- d-4 | o6 c4 f4 a-4 | o6 g4 e4 c4 |
          o6 d-4 f4 a-4 | o6 b-4 g4 e-4 | o6 f2. | o6 f2 r4 |`},
    },
    order: ['intro', 'A', 'B'], loop: 1,
  },
  selene: {
    title: '星降る円舞曲 〜 Da Capo', en: 'Starfall Waltz — Da Capo', bpm: 186, bar: 3,
    comment: 'セレネ・アストライアのテーマ。前作の最終ボス曲を、今作の楽器で編み直しました。音符は一つも変えていません。ダ・カーポは「はじめから」。覚えているステップを、もう一度確かめてもらうための一曲です。',
    tracks: {
      lead: {inst: 'trumpet', vol: .8, rev: .28, dly: .18}, harm: {inst: 'trumpet', vol: .38, pan: .25},
      keys: {inst: 'piano', vol: .36, pan: -.25, oct: 4}, arp: {inst: 'bell', vol: .26, pan: .3, oct: 5},
      pad: {inst: 'strings', vol: .32, oct: 3}, bass: {inst: 'bass', vol: .64, oct: 2},
    },
    sections: {
      A: {bars: 8, chords: 'Dm Bb Gm A Dm Bb C A', comp: {bass: 'waltz8', keys: 'waltz', pad: 1, drums: 'waltzd'}, crash: 1, lead: WALTZ1},
      B: {bars: 8, chords: 'F C Dm A Bb Gm A Dm', comp: {bass: 'waltz8', keys: 'waltz', arp: 'arp8w', pad: 1, drums: 'waltzd', harm: 1}, lead: WALTZ1B},
      C: {bars: 8, chords: 'Gm C F Bb Gm A Dm A', inst: {lead: 'violin'}, comp: {bass: 'waltz8', keys: 'waltz', arp: 'arp8w', pad: 1, drums: 'waltzf', harm: 1}, crash: 1, fill: 'fill3', lead: WALTZ1C},
    },
    order: ['A', 'B', 'C'], loop: 0,
  },
  boss4: {
    title: '月蝕のプリマドンナ', en: 'Prima Donna of the Eclipse', bpm: 178, bar: 4,
    comment: 'ノクス・エクリプティカのテーマ。千年のあいだ誰にも聴かれなかった歌姫が、やっと舞台に立った曲です。サビは同じ形を三度、一段ずつ高く。二周目の最後だけ、短三度上（ト短調）へ転調して歌い上げます。',
    tracks: {
      lead: {inst: 'trumpet', vol: .8, rev: .28, dly: .2}, harm: {inst: 'trumpet', vol: .38, pan: .25},
      keys: {inst: 'piano', vol: .36, pan: -.25, oct: 4}, pad: {inst: 'choir', vol: .36, oct: 3}, bass: {inst: 'bass', vol: .64, oct: 2},
    },
    sections: {
      intro: {bars: 4, chords: 'Em Em C B', inst: {lead: 'organ', keys: 'organ'}, comp: {keys: 'block', bass: 'hold', pad: 1}, timp: 1, fill: 'build4',
        lead: 'o5 l4 e2. b4 | g2. e4 | >c2. <g4 | f+2 >d+2 |'},
      A: {bars: 8, chords: 'Em D C B7 Em D C,D Em', comp: {bass: 'drive', keys: 'arp16', pad: 1, drums: 'fast'}, crash: 1,
        lead: `o5 l8 e4 b4 >e4 d <b | o6 d4 <a4 >f+4 e d | o6 e4 c4 g4 f+ e | o6 d+4 <b4 >f+2 |
          o6 g4. f+ e4 <b4 | o6 f+4. e d4 <a4 | o6 e4 c4 f+4 d4 | o6 e2. r4 |`},
      B: {bars: 8, chords: 'Am Em B7 Em Am Em F# B7', inst: {lead: 'violin'}, comp: {bass: 'eight', keys: 'arp16d', pad: 1, drums: 'half'}, fill: 'build4',
        lead: `o5 l8 a4 >c4 e2 | o6 e4 <b4 g2 | o5 f+4 a4 >d+2 | o6 e2. <b4 |
          o6 c4 e4 a2 | o6 g4 e4 <b2 | o5 a+4 >c+4 f+2 | o6 f+4 d+4 <b4 a4 |`},
      C: {bars: 8, chords: 'C D Em G Am B7 Em Em', comp: {bass: 'gallop', keys: 'arp16w', pad: 1, drums: 'drive', harm: 1}, crash: 1,
        lead: `o6 l8 e2 g4 e d | o6 f+2 a4 f+ e | o6 g2 b4 g f+ | o6 g4 d4 <b4 >d4 |
          o6 e4. c <a4 >c4 | o6 d+4. <b >f+4 a4 | o6 g4 f+ e <b2 | o6 e2. r4 |`},
      C2: {bars: 8, tr: 3, chords: 'C D Em G Am B7 Em Em', comp: {bass: 'gallop', keys: 'arp16w', pad: 1, drums: 'drive', harm: 1}, crash: 1, fill: 'fill4',
        lead: `o6 l8 e2 g4 e d | o6 f+2 a4 f+ e | o6 g2 b4 g f+ | o6 g4 d4 <b4 >d4 |
          o6 e4. c <a4 >c4 | o6 d+4. <b >f+4 a4 | o6 g4 f+ e <b2 | o6 e2. r4 |`},
    },
    order: ['intro', 'A', 'B', 'C', 'A', 'B', 'C', 'C2'], loop: 1,
  },
  finale: {
    title: '星降る円舞曲 第二夜 〜 Finale', en: 'Starfall Waltz — Second Night, Finale', bpm: 186, bar: 3,
    comment: '最後のスペル「星降る円舞曲・第二夜」で流れます。タイトル曲の主題を全員で。短調で一巡したあと、同じ旋律がニ長調に変わります。休符を迎え入れたワルツが、夜明けに向かって回りはじめるところ。',
    tracks: {
      lead: {inst: 'trumpet', vol: .8, rev: .3, dly: .18}, harm: {inst: 'trumpet', vol: .4, pan: .25},
      keys: {inst: 'piano', vol: .36, pan: -.25, oct: 4}, arp: {inst: 'bell', vol: .26, pan: .3, oct: 5},
      pad: {inst: 'strings', vol: .34, oct: 3}, bass: {inst: 'bass', vol: .64, oct: 2},
    },
    sections: {
      A: {bars: 16, chords: NIGHT2_CH, comp: {bass: 'waltz8', keys: 'waltz', pad: 1, drums: 'waltzf', harm: 1}, crash: 1, lead: NIGHT2},
      B: {bars: 16, chords: NIGHT2B_CH, inst: {lead: 'violin'}, comp: {bass: 'waltz8', keys: 'waltz', arp: 'arp8w', pad: 1, drums: 'waltzd'}, fill: 'fill3', lead: NIGHT2B},
      D: {bars: 16, chords: DAWN_CH, comp: {bass: 'waltz8', keys: 'waltz', arp: 'arp8w', pad: 1, drums: 'waltzf', harm: 1}, crash: 1, lead: DAWN},
      D2: {bars: 16, chords: DAWN_CH, comp: {bass: 'waltz8', keys: 'waltz', arp: 'arp8w', pad: 1, drums: 'waltzf', harm: 1}, crash: 1, fill: 'fill3', lead: DAWN},
    },
    order: ['A', 'B', 'D', 'D2'], loop: 2,
  },
  ending: {
    title: '夜明けのコーダ', en: 'Coda at Daybreak', bpm: 100, bar: 3,
    comment: 'エンディング。フィナーレで長調に変わった主題を、オルゴールがゆっくり弾きます。タイトル曲と同じ楽器、同じ旋律で、短調が長調になっただけ。一晩で変わったのは、それだけです。',
    tracks: {
      lead: {inst: 'musicbox', vol: .8, rev: .5}, harm: {inst: 'violin', vol: .36, pan: .2, rev: .45},
      arp: {inst: 'harp', vol: .4, pan: .3, oct: 4}, pad: {inst: 'strings', vol: .34, oct: 3}, bass: {inst: 'pizz', vol: .6, oct: 2},
    },
    sections: {
      A: {bars: 16, chords: DAWN_CH, comp: {arp: 'arp8w'}, lead: DAWN},
      A2: {bars: 16, chords: DAWN_CH, inst: {lead: 'violin'}, comp: {bass: 'waltz', arp: 'arp8w', pad: 1, drums: 'waltz', harm: 1}, lead: DAWN},
    },
    order: ['A', 'A2'], loop: 0,
  },
};
for (const [id, s] of Object.entries(SONGS)) s.id = id;
// 音楽室での並び順
export const TRACK_ORDER = ['title', 'stage1', 'boss1', 'stage2', 'boss2', 'stage3', 'boss3', 'stage4', 'selene', 'boss4', 'finale', 'ending'];
