// せかい・ステージ・うた の定義（画面に出る文字は ひらがな・カタカナ だけ）
export const W = 960, H = 540;

// ---- 弾幕（ほしふる ワルツ）----
const STAR_STAGES = [
  { kind: 'danmaku', costume: 'star', name: 'ほしぞらの みち', hint: 'ゆびで うごかして たまを よけよう。ピンチは ボム！',
    phases: [
      { type: 'wave', dur: 9, n: 5, side: 'l' },
      { type: 'wave', dur: 9, n: 5, side: 'r' },
      { type: 'wave', dur: 11, n: 8, side: 'both' },
      { type: 'wave', dur: 11, n: 9, side: 'both' },
      { type: 'boss', boss: 'comet', hp: 60, dur: 20, pattern: 'ring' },
      { type: 'boss', boss: 'comet', hp: 70, dur: 22, pattern: 'cross', name: 'かざぐるま スター' },
    ] },
  { kind: 'danmaku', costume: 'star', name: 'ながれぼしの そら', hint: 'ひかる てんに あたらなければ だいじょうぶ',
    phases: [
      { type: 'wave', dur: 10, n: 8, side: 'both' },
      { type: 'boss', boss: 'comet', hp: 60, dur: 20, pattern: 'ring' },
      { type: 'boss', boss: 'comet', hp: 75, dur: 22, pattern: 'rain', name: 'ながれぼしの シャワー' },
      { type: 'wave', dur: 11, n: 10, side: 'both' },
      { type: 'boss', boss: 'comet', hp: 70, dur: 22, pattern: 'spiral', name: 'ぐるぐる ほうきぼし' },
      { type: 'boss', boss: 'comet', hp: 80, dur: 24, pattern: 'flower', name: 'ほうきぼしの はなび' },
    ] },
  { kind: 'danmaku', costume: 'star', name: 'つきの ぶとうかい', hint: 'たまの すきまを さがして とおろう', bossIntro: 'bossStar',
    phases: [
      { type: 'boss', boss: 'luna', hp: 55, dur: 18, pattern: 'waltz' },
      { type: 'boss', boss: 'luna', hp: 60, dur: 20, pattern: 'curtain', name: 'オーロラの カーテン' },
      { type: 'boss', boss: 'luna', hp: 55, dur: 18, pattern: 'cross' },
      { type: 'boss', boss: 'luna', hp: 65, dur: 20, pattern: 'flower', name: 'つきの フェルマータ' },
      { type: 'boss', boss: 'luna', hp: 65, dur: 20, pattern: 'spiral', name: 'くるくる ぎんが' },
      { type: 'boss', boss: 'luna', hp: 85, dur: 24, pattern: 'finale', name: 'ほしふる ワルツ' },
    ] },
];

// ---- 冒険（けんと たからの だいぼうけん）----
// 1ステージは いくつかの へや。X の かいだんで つぎの へやへ。さいごの へやに たからばこ
// # かべ  . ゆか  g くさ  k かぎの かくれた くさ  D とびら  C たからばこ  X かいだん
// B おせる ブロック  = レール  s スイッチ  P ぷにゅ
// e スライム  E おおスライム（3かい）  b コウモリ（よこ）  v コウモリ（たて）
// door: key＝かぎ  switch＝スイッチ ぜんぶ  clear＝スライムを ぜんぶ たおす
const ARENA = [
  '################',
  '#..............#',
  '#..............#',
  '#..............#',
  '#.P............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '################',
];
const HERO_STAGES = [
  { kind: 'adventure', costume: 'hero', name: 'くさはらの かぎ', hint: 'くさを きって かぎを さがそう', theme: 'field', item: 'shield', itemName: 'ゆうしゃの たて',
    rooms: [
      { door: 'key', hint: 'くさを きって かぎを さがそう', map: [
        '################',
        '#P..g..g...#...#',
        '#..gg..g.g.#...#',
        '#.g..k...g.#...#',
        '#....gg....D..X#',
        '#.g.....g.g#...#',
        '#..g.gg..e.#...#',
        '#.e..g...g.#...#',
        '################',
      ] },
      { door: 'clear', hint: 'スライムを ぜんぶ たおすと とびらが あくよ', map: [
        '################',
        '#..g.....g..#..#',
        '#....e...b..#..#',
        '#..g....g...#..#',
        '#P....gg....D.X#',
        '#..e........#..#',
        '#.g...g..e..#..#',
        '#....g......#..#',
        '################',
      ] },
      { door: 'key', hint: 'コウモリに きを つけて かぎを さがそう', map: [
        '################',
        '#g.g...v...g.gk#',
        '#.....#.#......#',
        '#P....#.#...e..#',
        '#..b..........##',
        '#.....#.#...#D##',
        '#.g...#.#...#.C#',
        '#g.g....b...#..#',
        '################',
      ] },
    ] },
  { kind: 'adventure', costume: 'hero', name: 'どうくつの スイッチ', hint: 'ブロックを おして スイッチに のせよう', theme: 'cave', item: 'sword', itemName: 'ひかりの つるぎ',
    rooms: [
      { door: 'switch', hint: 'ブロックを おして スイッチに のせよう', map: [
        '################',
        '#......#########',
        '#.B===s#.......#',
        '#......#...b...#',
        '#P...e.D......X#',
        '#......#...e...#',
        '#.B===s#.......#',
        '#......#########',
        '################',
      ] },
      { door: 'switch', hint: 'スイッチは みっつ。うえから おす ブロックも あるよ', map: [
        '################',
        '#P.....#...#####',
        '#.B===s#.B.#...#',
        '#......#.=.#...#',
        '#..e.....=.D..X#',
        '#......#.s.#...#',
        '#.B===s#...#...#',
        '#......#.E.#####',
        '################',
      ] },
      { door: 'clear', hint: 'スライムを ぜんぶ たおして たからばこへ', map: [
        '################',
        '#....v.....v...#',
        '#.##.....##....#',
        '#P.....E.....e.#',
        '#.##.....##....#',
        '#....e.......#D#',
        '#.##.....##..#C#',
        '#......b.....###',
        '################',
      ] },
    ] },
  { kind: 'adventure', costume: 'hero', name: 'たからの へや', hint: 'めを まわした ときに えいっ！', theme: 'castle', bossIntro: 'bossHero', item: 'crown', itemName: 'おうさまの かんむり',
    rooms: [
      { door: 'clear', hint: 'おしろの みはりを ぜんぶ たおそう', map: [
        '################',
        '#......v.......#',
        '#.#..E.....e.###',
        '#............###',
        '#P...........DX#',
        '#............###',
        '#.#..e.....E.###',
        '#.......v......#',
        '################',
      ] },
      { door: 'none', hint: 'めを まわした ときに えいっ！', boss: { kind: 'king', hp: 10, x: 11, y: 4 }, chestAt: [8, 1], map: ARENA },
    ] },
];

// ---- リズム（きらめき アイドル ステージ）----
// 1しょうせつ = 8もじ（8ぶおんぷ）。1 2 3 = ひだり・まんなか・みぎ。4 5 6 = ふたつ どうじ
// きらきらが 6わり に とどかないと もういちど
const IDOL_STAGES = [
  { kind: 'rhythm', costume: 'idol', name: 'はじめての レッスン', hint: 'ひかりが わっかに かさなったら タッチ！', bpm: 100, key: 60, chords: [0, 5, 7, 0], fall: 1.6,
    bars: ['........', '........',
      '1...2...', '3...2...', '1.2.3...', '3.2.1...',
      '1.1.2.2.', '3.3.2...', '1.2.3.2.', '1...3...',
      '4...5...', '1.2.3...', '6...2...', '3.2.1...',
      '1.2.3.2.', '1.2.3.2.', '4...4...', '2.......'] },
  { kind: 'rhythm', costume: 'idol', name: 'どきどき オーディション', hint: 'ふたつ いっしょに くる ときは りょうてで！', bpm: 116, key: 65, chords: [0, 9, 5, 7], fall: 1.4,
    bars: ['........', '........',
      '1.2.3...', '3.2.1...', '1.3.2...', '2.1.3...', '4...2.3.', '5...2.1.', '1.1.3.3.', '2.2.6...',
      '1.2.3.2.', '3.2.1.2.', '1.2.1.2.', '3.2.3.2.', '4.3.5.1.', '6...6...', '1.2.3.2.', '1.2.3...',
      '3.3.1.1.', '2.5.2.4.', '1.2.3.2.', '3.2.1.2.', '4...5...', '6.......'] },
  { kind: 'rhythm', costume: 'idol', name: 'きらめき ファイナル ライブ', hint: 'ノイズを うたで ふきとばそう', noise: true, bossIntro: 'bossIdol', bpm: 128, key: 62, chords: [0, 7, 9, 5], fall: 1.25,
    bars: ['........', '........',
      '1.2.3.2.', '1.2.3.2.', '3.2.1.2.', '3.2.1.2.', '4.2.5.2.', '6.2.6.2.', '1..2..3.', '3..2..1.',
      '1.1.2.2.', '3.3.2.2.', '1.3.1.3.', '2.5.2.4.', '1.2.3.1.', '2.3.1.2.', '3.1.2.3.', '4...5...',
      '1.2.3.2.', '3.2.1.2.', '4.3.5.1.', '6.2.6.2.', '1..2..3.', '3..2..1.', '1.2.3.2.', '1.2.3.2.', '4.5.4.5.', '6.......'] },
];

// ---- レース（びゅんびゅん サーキット）----
// コーンに あたると ハートが へる。3ばん いないで ゴールすれば クリア
const RACE_STAGES = [
  { kind: 'race', costume: 'racer', name: 'はじめての コース', hint: 'ひだりと みぎを タッチ して よけよう', theme: 'field', len: 13000, density: 1.1, rivals: ['slime', 'starkid', 'comet'] },
  { kind: 'race', costume: 'racer', name: 'うみべの コース', hint: 'まえの カートは よこから ぬかそう', theme: 'sea', len: 15500, density: 1.2, rivals: ['comet', 'slime', 'starkid'] },
  { kind: 'race', costume: 'racer', name: 'バグバグ グランプリ', hint: 'バグバグの おとす ブロックに きを つけて', theme: 'glitch', len: 18000, density: 1.4, rivals: ['slime', 'comet', 'bug'], bossIntro: 'bossRace' },
];

export const WORLDS = [
  { id: 'star', title: ['ほしふる', 'ワルツ'], sub: 'たまよけ シューティング', costume: 'star', color: '#6b4de0', color2: '#ff8fd0', stages: STAR_STAGES },
  { id: 'hero', title: ['けんと たからの', 'だいぼうけん'], sub: 'ぼうけん アクション', costume: 'hero', color: '#3fa34d', color2: '#ffd84a', stages: HERO_STAGES },
  { id: 'idol', title: ['きらめき☆', 'アイドル ステージ'], sub: 'リズム ゲーム', costume: 'idol', color: '#ff6fb0', color2: '#7fe0ff', stages: IDOL_STAGES },
  { id: 'race', title: ['びゅんびゅん', 'サーキット'], sub: 'レース ゲーム', costume: 'racer', color: '#e8483f', color2: '#ffb347', stages: RACE_STAGES },
];

// ---- さいご（バグバグの まぜこぜ ゲーム）----
export const FINAL = {
  id: 'bug', title: ['バグバグの', 'まぜこぜ ゲーム'], sub: 'ぜんぶ まぜこぜ！', costume: 'none', color: '#5a2d8a', color2: '#58f0a0',
  stages: [
    { kind: 'danmaku', costume: 'star', name: 'まぜこぜ その１', hint: 'バグバグの たまを よけよう',
      phases: [
        { type: 'boss', boss: 'bug', hp: 55, dur: 18, pattern: 'glitch' },
        { type: 'boss', boss: 'bug', hp: 60, dur: 20, pattern: 'cross', name: 'ぐるぐる バグ' },
        { type: 'boss', boss: 'bug', hp: 65, dur: 20, pattern: 'flower', name: 'とまって うごく バグ' },
        { type: 'boss', boss: 'bug', hp: 80, dur: 24, pattern: 'finale', name: 'めちゃくちゃ ワルツ' },
      ] },
    { kind: 'adventure', costume: 'hero', name: 'まぜこぜ その２', hint: 'めを まわした ときに えいっ！', theme: 'glitch',
      door: 'none', item: 'heart', itemName: 'なかよしの ハート',
      boss: { kind: 'bug', hp: 10, x: 11, y: 4 }, chestAt: [8, 1], map: ARENA },
    { kind: 'rhythm', costume: 'idol', name: 'まぜこぜ その３', hint: 'バグバグと いっしょに おどろう', duet: true, bpm: 122, key: 60, chords: [0, 7, 9, 5], fall: 1.3,
      bars: ['........', '........', '1.2.3.2.', '3.2.1.2.', '4...5...', '6.2.6.2.', '1.1.3.3.', '2.2.2...',
        '1.2.3.2.', '1.2.3.2.', '4.3.5.1.', '1..2..3.', '3..2..1.', '4.5.4.5.', '1.2.3.2.', '6.......'] },
  ],
};

// ---- まぜこぜ モード（エンディングの あとに ひらく）----
// ハートが なくなるまで つづく。rounds は よういして おく かず
export const MIX = { id: 'mix', title: ['まぜこぜ', 'モード'], sub: 'つぎつぎ ゲーム', costume: 'none', color: '#ff8a3f', color2: '#ffd84a', rounds: 40, hearts: 4 };

// ---- ともだち あつめ：★が ふえると ひろばに あそびに くる ----
export const FRIENDS = [
  { id: 'starkid', name: 'ほしっこ', need: 2 },
  { id: 'slime', name: 'スライム', need: 4 },
  { id: 'comet', name: 'ポポ', need: 6 },
  { id: 'luna', name: 'ルナリア', need: 9 },
  { id: 'king', name: 'スライム キング', need: 12 },
  { id: 'bug', name: 'バグバグ', ending: true },
];

export const ALL_WORLDS = [...WORLDS, FINAL];
export const worldById = id => ALL_WORLDS.find(w => w.id === id);
