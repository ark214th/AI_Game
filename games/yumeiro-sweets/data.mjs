// ゆめいろ おかしやさん の データ（がめんに でる ことばは ひらがな・カタカナ だけ）

// おかしの どだい
export const BASES = {
  cake: { name: 'ケーキ' },
  cupcake: { name: 'カップケーキ' },
  donut: { name: 'ドーナツ' },
  pancake: { name: 'パンケーキ' },
  parfait: { name: 'パフェ' },
};

// クリームの いろ（c：いろ、d：かげ、l：ひかり）
export const CREAMS = {
  pink: { name: 'ピンク', adj: 'ピンクの', c: '#ffb6d0', d: '#f08cb2', l: '#ffe3ee' },
  white: { name: 'しろ', adj: 'しろい', c: '#fffaf4', d: '#efdccf', l: '#ffffff' },
  choco: { name: 'チョコ', adj: 'チョコの', c: '#b9826a', d: '#946052', l: '#d8a690' },
  sky: { name: 'みずいろ', adj: 'みずいろの', c: '#aee0ff', d: '#7fc3ef', l: '#e2f4ff' },
  mint: { name: 'ミント', adj: 'ミントの', c: '#aef0d6', d: '#78d4b4', l: '#e0fbef' },
  lavender: { name: 'ラベンダー', adj: 'ラベンダーの', c: '#d8bfff', d: '#b597ec', l: '#f0e6ff' },
  lemon: { name: 'レモン', adj: 'レモンの', c: '#fff0a0', d: '#f0d460', l: '#fffbe0' },
};

// のせる もの
export const TOPPINGS = {
  strawberry: { name: 'いちご', adj: 'いちごの' },
  heart: { name: 'ハート', adj: 'ハートの' },
  star: { name: 'ほし', adj: 'ほしの' },
  cherry: { name: 'さくらんぼ', adj: 'さくらんぼの' },
  ribbon: { name: 'リボン', adj: 'リボンの' },
  macaron: { name: 'マカロン', adj: 'マカロンの' },
  crown: { name: 'おうかん', adj: 'おうかんの' },
  rainbow: { name: 'にじ', adj: 'にじの' },
  butterfly: { name: 'ちょうちょ', adj: 'ちょうちょの' },
  bear: { name: 'くまクッキー', adj: 'くまの' },
};

// しぼりぐち
export const NOZZLES = {
  swirl: { name: 'ぐるぐる' },
  drop: { name: 'ぽってり' },
};

// おきゃくさん（すきな ものが ちゅうもんに でやすい）
export const CUSTOMERS = {
  usagi: {
    name: 'もちうさ', base: 'cake', cream: 'pink', top: 'strawberry',
    hello: ['こんにちは！', 'きょうも きちゃった！'],
    love: ['もちもち しあわせ〜！', 'いちばん すきな やつ！'],
  },
  kuma: {
    name: 'ちびくま', base: 'cupcake', cream: 'choco', top: 'heart',
    hello: ['あの… こんにちは', 'おなか すいちゃった'],
    love: ['うれしくて なみだが でちゃう！', 'ずっと たべたかったの！'],
  },
  hitsuji: {
    name: 'ねむひつじ', base: 'pancake', cream: 'sky', top: 'star',
    hello: ['ふわぁ… こんにちは', 'ねむねむ…'],
    love: ['めが さめちゃった！', 'ゆめみたい…！'],
  },
  neko: {
    name: 'ゆめねこ', base: 'parfait', cream: 'lavender', top: 'ribbon',
    hello: ['ごきげんよう にゃ', 'おしゃれな おかし ある？'],
    love: ['とっても おしゃれ にゃ！', 'これ これ！ にゃーん！'],
  },
  penguin: {
    name: 'ほしペン', base: 'donut', cream: 'lemon', top: 'crown',
    hello: ['よるの そらから きたよ', 'こんばんは ペン！'],
    love: ['ほしみたいに きらきら ペン！', 'おうさまの きぶん ペン！'],
  },
  punyu: {
    name: 'ぷにゅ', base: 'cupcake', cream: 'pink', top: 'macaron',
    hello: ['きらきらランドから きたよ！', 'ぷにゅ〜！'],
    love: ['ぷにゅ〜っ！ さいこう！', 'ほしの かけらより すてき！'],
  },
};

// ドレス（main：ドレス、sub：フリル、hair：かみ）
export const DRESSES = {
  pink: { name: 'ピンク', main: '#ff8fbd', sub: '#ffd3e6', hair: '#ff9cc6', hairD: '#f173a6' },
  sky: { name: 'みずいろ', main: '#7fc8ff', sub: '#d4ecff', hair: '#8fd2ff', hairD: '#5fb1ec' },
  lavender: { name: 'ラベンダー', main: '#b998ff', sub: '#e8dcff', hair: '#c7a8ff', hairD: '#a07fea' },
  mint: { name: 'ミント', main: '#6fdcb6', sub: '#d3f8ea', hair: '#86e6c4', hairD: '#55c9a1' },
  lemon: { name: 'レモン', main: '#ffd75e', sub: '#fff3c4', hair: '#ffe07a', hairD: '#f0be3c' },
  rainbow: { name: 'にじいろ', main: '#ff9ccb', sub: '#e6f6ff', hair: '#ffb0d4', hairD: '#c69cff', rainbow: true },
};

// おみせの かべ
export const THEMES = {
  ichigo: { name: 'いちごミルク', wall: '#ffe3ee', stripe: '#ffd0e2', awn: ['#ff8fbd', '#ffffff'], trim: '#ff8fbd', counter: '#ffc2da', sky: ['#bfe6ff', '#fff0f7'] },
  sora: { name: 'そらいろ', wall: '#e2f3ff', stripe: '#cfeaff', awn: ['#7fc8ff', '#ffffff'], trim: '#7fc8ff', counter: '#bfe2ff', sky: ['#a8dcff', '#eef8ff'] },
  mint: { name: 'ミント', wall: '#e2fbf0', stripe: '#cdf4e3', awn: ['#6fdcb6', '#fffbe8'], trim: '#5fcfa6', counter: '#bdf0dc', sky: ['#b6ecff', '#f2fff9'] },
  yume: { name: 'ゆめかわ', wall: '#f1e8ff', stripe: '#ffe1f0', awn: ['#c7a8ff', '#ffc2dc'], trim: '#b998ff', counter: '#e2d2ff', sky: ['#ffd6ec', '#d9ccff'] },
  hoshi: { name: 'ほしぞら', wall: '#3d3a78', stripe: '#46428a', awn: ['#7a6cd8', '#ffe28a'], trim: '#ffe28a', counter: '#5b54a8', sky: ['#1d1b4a', '#5a3f8f'], night: true },
};

// ハートが たまると ふえる もの
export const UNLOCKS = [
  { at: 0, items: ['base:cake', 'base:cupcake', 'cream:pink', 'cream:white', 'cream:choco', 'top:strawberry', 'top:heart', 'top:star', 'cust:usagi', 'cust:kuma', 'dress:pink', 'theme:ichigo', 'nozzle:swirl', 'nozzle:drop'] },
  { at: 5, items: ['base:donut'] },
  { at: 10, items: ['cream:sky', 'cust:hitsuji'] },
  { at: 15, items: ['top:cherry', 'top:ribbon', 'dress:sky'] },
  { at: 22, items: ['base:pancake'] },
  { at: 30, items: ['cream:mint', 'cust:neko', 'theme:sora'] },
  { at: 38, items: ['top:macaron', 'dress:lavender'] },
  { at: 48, items: ['base:parfait'] },
  { at: 58, items: ['cream:lavender', 'theme:mint'] },
  { at: 70, items: ['top:crown', 'top:rainbow', 'dress:mint'] },
  { at: 84, items: ['cust:penguin', 'cream:lemon', 'theme:yume'] },
  { at: 100, items: ['top:butterfly', 'top:bear', 'cust:punyu', 'dress:lemon'] },
  { at: 120, items: ['theme:hoshi', 'dress:rainbow'] },
];

export const KIND_TABLE = { base: BASES, cream: CREAMS, top: TOPPINGS, cust: CUSTOMERS, dress: DRESSES, theme: THEMES, nozzle: NOZZLES };
export const KIND_LABEL = { base: 'あたらしい おかし', cream: 'あたらしい クリーム', top: 'あたらしい トッピング', cust: 'あたらしい おきゃくさん', dress: 'あたらしい ドレス', theme: 'あたらしい おみせの かべ', nozzle: 'しぼりぐち' };

export const PERFECT_HEARTS = 3;
export const GOOD_HEARTS = 2;
export const ALBUM_MAX = 60;
export const MAX_DOLLOPS = 70;
export const MAX_TOPPINGS = 40;
export const NAME_MAX = 6;
