// せかい・ステージ・うた の定義（画面に出る文字は ひらがな・カタカナ だけ）
export const W = 960, H = 540;

// ---- 弾幕（ほしふる ワルツ）----
const STAR_STAGES = [
  { kind: 'danmaku', costume: 'star', name: 'ほしぞらの みち', hint: 'ゆびで ぷにゅを うごかして たまを よけよう',
    phases: [
      { type: 'wave', dur: 9, n: 4, side: 'l' },
      { type: 'wave', dur: 9, n: 4, side: 'r' },
      { type: 'wave', dur: 11, n: 6, side: 'both' },
    ] },
  { kind: 'danmaku', costume: 'star', name: 'ながれぼしの そら', hint: 'ひかる てんに あたらなければ だいじょうぶ',
    phases: [
      { type: 'wave', dur: 9, n: 5, side: 'both' },
      { type: 'boss', boss: 'comet', hp: 55, dur: 17, pattern: 'ring' },
      { type: 'boss', boss: 'comet', hp: 65, dur: 19, pattern: 'rain', name: 'ながれぼしの シャワー' },
    ] },
  { kind: 'danmaku', costume: 'star', name: 'つきの ぶとうかい', hint: 'たまの すきまを ゆっくり とおろう', bossIntro: 'bossStar',
    phases: [
      { type: 'boss', boss: 'luna', hp: 55, dur: 16, pattern: 'waltz' },
      { type: 'boss', boss: 'luna', hp: 65, dur: 18, pattern: 'curtain', name: 'オーロラの カーテン' },
      { type: 'boss', boss: 'luna', hp: 65, dur: 18, pattern: 'spiral', name: 'くるくる ぎんが' },
      { type: 'boss', boss: 'luna', hp: 85, dur: 22, pattern: 'finale', name: 'ほしふる ワルツ' },
    ] },
];

// ---- 冒険（けんと たからの だいぼうけん）----
// # かべ  . ゆか  g くさ  k かぎの かくれた くさ  D とびら  C たからばこ
// B おせる ブロック  = レール  s スイッチ  e スライム  P ぷにゅ
const HERO_STAGES = [
  { kind: 'adventure', costume: 'hero', name: 'くさはらの かぎ', hint: 'くさを きって かぎを さがそう', theme: 'field',
    door: 'key', item: 'shield', itemName: 'ゆうしゃの たて',
    map: [
      '################',
      '#P..g..g...#..C#',
      '#..gg..g.g.#...#',
      '#.g..k...g.#...#',
      '#....gg....D...#',
      '#.g.....g.g#...#',
      '#..g.gg..e.#...#',
      '#....g...g.#...#',
      '################',
    ] },
  { kind: 'adventure', costume: 'hero', name: 'どうくつの スイッチ', hint: 'ブロックを おして スイッチに のせよう', theme: 'cave',
    door: 'switch', item: 'sword', itemName: 'ひかりの つるぎ',
    map: [
      '################',
      '#......#########',
      '#.B===s#.....C.#',
      '#......#.......#',
      '#P...e.D...e...#',
      '#......#.......#',
      '#.B===s#.......#',
      '#......#########',
      '################',
    ] },
  { kind: 'adventure', costume: 'hero', name: 'たからの へや', hint: 'めを まわした ときに えいっ！', theme: 'castle', bossIntro: 'bossHero',
    door: 'none', item: 'crown', itemName: 'おうさまの かんむり',
    boss: { kind: 'king', hp: 8, x: 11, y: 4 }, chestAt: [8, 1],
    map: [
      '################',
      '#..............#',
      '#..............#',
      '#..............#',
      '#.P............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '################',
    ] },
];

// ---- リズム（きらめき アイドル ステージ）----
// 1しょうせつ = 8もじ（8ぶおんぷ）。1 2 3 = ひだり・まんなか・みぎ
const IDOL_STAGES = [
  { kind: 'rhythm', costume: 'idol', name: 'はじめての レッスン', hint: 'ひかりが わっかに かさなったら タッチ！', anyLane: true,
    bpm: 96, key: 60, chords: [0, 5, 7, 0],
    bars: ['........', '........', '1...2...', '3...2...', '1...1...', '2...3...', '1...2...', '3...3...',
      '2...1...', '2...3...', '1.2.3...', '3.2.1...', '1...3...', '2.......'] },
  { kind: 'rhythm', costume: 'idol', name: 'どきどき オーディション', hint: 'いろの ばしょを よく みてね',
    bpm: 108, key: 65, chords: [0, 9, 5, 7],
    bars: ['........', '........', '1...3...', '2...2...', '1.2.3...', '3.2.1...', '1...2.3.', '3...2.1.',
      '2.2.3...', '2.2.1...', '1.3.1.3.', '2...2...', '1.2.3.2.', '1.2.3.2.', '3...1...', '2.......'] },
  { kind: 'rhythm', costume: 'idol', name: 'きらめき ファイナル ライブ', hint: 'ノイズを うたで ふきとばそう', noise: true, bossIntro: 'bossIdol',
    bpm: 118, key: 62, chords: [0, 7, 9, 5],
    bars: ['........', '........', '1...2...', '3...2...', '1.2.3...', '3.2.1...', '1.1.3.3.', '2...2...',
      '1.3.2...', '3.1.2...', '1.2.3.2.', '1.2.3.2.', '3.3.1.1.', '2...2...', '1.2.3.1.', '2.3.1.2.',
      '3.2.1.2.', '3...1...', '2...2...', '2.......'] },
];

export const WORLDS = [
  { id: 'star', title: ['ほしふる', 'ワルツ'], sub: 'たまよけ シューティング', costume: 'star', color: '#6b4de0', color2: '#ff8fd0', stages: STAR_STAGES },
  { id: 'hero', title: ['けんと たからの', 'だいぼうけん'], sub: 'ぼうけん アクション', costume: 'hero', color: '#3fa34d', color2: '#ffd84a', stages: HERO_STAGES },
  { id: 'idol', title: ['きらめき☆', 'アイドル ステージ'], sub: 'リズム ゲーム', costume: 'idol', color: '#ff6fb0', color2: '#7fe0ff', stages: IDOL_STAGES },
];

// ---- さいご（バグバグの まぜこぜ ゲーム）----
export const FINAL = {
  id: 'bug', title: ['バグバグの', 'まぜこぜ ゲーム'], sub: 'ぜんぶ まぜこぜ！', costume: 'none', color: '#5a2d8a', color2: '#58f0a0',
  stages: [
    { kind: 'danmaku', costume: 'star', name: 'まぜこぜ その１', hint: 'バグバグの たまを よけよう',
      phases: [
        { type: 'boss', boss: 'bug', hp: 55, dur: 16, pattern: 'glitch' },
        { type: 'boss', boss: 'bug', hp: 70, dur: 20, pattern: 'finale', name: 'めちゃくちゃ ワルツ' },
      ] },
    { kind: 'adventure', costume: 'hero', name: 'まぜこぜ その２', hint: 'めを まわした ときに えいっ！', theme: 'glitch',
      door: 'none', item: 'heart', itemName: 'なかよしの ハート',
      boss: { kind: 'bug', hp: 6, x: 11, y: 4 }, chestAt: [8, 1],
      map: [
        '################',
        '#..............#',
        '#..............#',
        '#..............#',
        '#.P............#',
        '#..............#',
        '#..............#',
        '#..............#',
        '################',
      ] },
    { kind: 'rhythm', costume: 'idol', name: 'まぜこぜ その３', hint: 'バグバグと いっしょに おどろう', duet: true,
      bpm: 112, key: 60, chords: [0, 7, 9, 5],
      bars: ['........', '........', '1...2...', '3...2...', '1.2.3...', '3.2.1...', '1...3...', '2.2.2...',
        '1.2.3.2.', '1.2.3.2.', '3...1...', '2.......'] },
  ],
};

export const ALL_WORLDS = [...WORLDS, FINAL];
export const worldById = id => ALL_WORLDS.find(w => w.id === id);
