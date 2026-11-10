// ゲームのデータ（しま・はし・もや・ともだち・すんでいる こ・あそび・シール・おてがみ・かけら）
// 画面に出る字は ひらがな・カタカナ だけにする（漢字を使わない）

// ---- しま と はし ----
// しまは まるい。r は みための はんけい、あるける のは r - EDGE まで。fog が あると、その もやが はれるまで いけない
export const EDGE = 1.4;
export const ISLANDS = [
  { id: 'nohara', name: 'おはなの のはら', x: 0, z: 0, r: 22 },
  { id: 'umibe', name: 'きらきら うみべ', x: 54, z: 0, r: 20 },
  { id: 'okashi', name: 'おかしの もり', x: 0, z: -56, r: 18, fog: 'okashi' },
  { id: 'kumo', name: 'ふわふわ くものうえ', x: -52, z: -52, r: 18, fog: 'kumo' },
  { id: 'hoshi', name: 'ほしぞらの おか', x: 54, z: -54, r: 18, fog: 'hoshi' },
  { id: 'moya', name: 'もやもやの おか', x: 0, z: -106, r: 15, fog: 'moya' },
];

// はし。a → b を むすぶ
export const BRIDGES = [
  { id: 'b-umibe', from: 'nohara', to: 'umibe', a: { x: 20, z: 0 }, b: { x: 35.5, z: 0 }, hw: 1.7 },
  { id: 'b-okashi', from: 'nohara', to: 'okashi', a: { x: 0, z: -20 }, b: { x: 0, z: -39.5 }, hw: 1.7, fog: 'okashi' },
  { id: 'b-kumo', from: 'okashi', to: 'kumo', a: { x: -16, z: -55.6 }, b: { x: -35.6, z: -52.4 }, hw: 1.7, fog: 'kumo' },
  { id: 'b-hoshi', from: 'umibe', to: 'hoshi', a: { x: 54, z: -18 }, b: { x: 54, z: -37.5 }, hw: 1.7, fog: 'hoshi' },
  { id: 'b-moya', from: 'okashi', to: 'moya', a: { x: 0, z: -73 }, b: { x: 0, z: -92.5 }, hw: 1.7, fog: 'moya' },
];

// もや。えがおが need に なると はれる（'main' は 5にんの ともだち ぜんいん）
export const FOGS = [
  { id: 'okashi', need: 2, x: 0, z: -30 },
  { id: 'kumo', need: 4, x: -26, z: -54 },
  { id: 'hoshi', need: 4, x: 54, z: -28 },
  { id: 'moya', need: 'main', x: 0, z: -83 },
];

// とおれない もの。まるで あたりを とる。kind：き / やし / ぼうつきキャンディ / ランタン
export const TREES = [
  { x: -8, z: -6, s: 1 }, { x: 9, z: 9, s: 1.15 }, { x: -17, z: -9, s: 0.9 }, { x: 14, z: -12, s: 1 },
  { x: -4, z: 17, s: 1.05 }, { x: 12, z: 16, s: 0.85 }, { x: -18, z: 2, s: 1 },
  { x: 43, z: -10, s: 1, kind: 'palm' }, { x: 66, z: -13, s: 1.1, kind: 'palm' }, { x: 48, z: -15, s: 0.9, kind: 'palm' },
  { x: -10, z: -48, s: 1, kind: 'candy', c: 0xff8fb5 }, { x: 11, z: -50, s: 1.1, kind: 'candy', c: 0xb79cff },
  { x: -11, z: -65, s: 0.9, kind: 'candy', c: 0x8fd8ff }, { x: 14, z: -59, s: 1, kind: 'candy', c: 0xffe066 },
  { x: 44, z: -58, s: 1, kind: 'lamp' }, { x: 64, z: -50, s: 1, kind: 'lamp' }, { x: 60, z: -65, s: 1, kind: 'lamp' }, { x: 46, z: -43, s: 1, kind: 'lamp' },
];
// いわ。kind 'cloud' は くものうえの もこもこ
export const ROCKS = [
  { x: -11, z: 15, r: 0.9 }, { x: 17, z: 6, r: 1.1 }, { x: -15, z: -14, r: 1.0 },
  { x: 68, z: -3, r: 1.2 }, { x: 40, z: 4, r: 0.9 },
  { x: -58, z: -41, r: 1.5, kind: 'cloud' }, { x: -44, z: -61, r: 1.3, kind: 'cloud' }, { x: -64, z: -58, r: 1.4, kind: 'cloud' },
];
export const POND = { x: -12, z: 7, r: 4.2 };
export const CAKE = { x: 8, z: -67, r: 3.6 };              // おかしの もりの おおきな ケーキ
export const PAD = { x: -46, z: -49, r: 1.1 };             // ほしを そらへ とばす「ほしの だい」

// ---- うみべの なみ ----
// うみは まるく、はんけいが ひろがったり ちぢんだり する（＝なみが よせて ひく）
export const SEA = { x: 54, z: 23, mid: 15.6, amp: 2.1, period: 7.5, deep: 12.4 };

// ---- ともだち（えがおに すると ついてくる 5にん と、さいごの でかもやもや） ----
// say：ask＝はなしかけた とき ／ again＝もういちど あそぶ とき ／ done＝えがおに なった とき
export const FRIENDS = [
  {
    id: 'chapu', name: 'ちゃぷ', icon: '🦦', bubble: '🐚', home: { x: -5, z: 3 }, island: 'nohara', play: 'shells',
    say: {
      ask: ['えーん… だいじな かいがらを なくしちゃった', 'はまべに あると おもうんだ。いっしょに さがして！'],
      beach: ['なみが ひいたら かいがらが でてくるよ', 'かいがらに さわって ひろってね！'],
      tip: 'うみの おくに にじいろの かいがらも あるよ',
      again: ['もういちど さがそう！ にじいろの かいがらも みつけてね'],
      done: 'ぜんぶ みつかった！ ありがとう！',
    },
  },
  {
    id: 'kani', name: 'おおきなカニ', icon: '🦀', bubble: '✊', home: { x: 61, z: -7 }, island: 'umibe', play: 'janken',
    say: {
      ask: ['ひまだなあ… だれか あそんで くれない かなあ', 'きみ、じゃんけん しようよ チョキ！ 3かい かったら きみの かち！', 'ぼくは だす まえに、てが ちらっと みえちゃうんだ。よーく みててね'],
      again: ['もう ひとしょうぶ チョキ！ こんどは まけないぞ〜'],
      done: 'まけた〜！ でも たのしかった チョキ！',
    },
  },
  {
    id: 'jelly', name: 'ぷるるんゼリー', icon: '🍮', bubble: '🍓', home: { x: 4, z: -57 }, island: 'okashi', play: 'deco',
    say: {
      ask: ['ぷるるん… あたまが さみしいの', 'クリームや フルーツで かざって ほしいな', 'ふきだしの えと おなじ ものを のせて くれたら、もっと うれしい！'],
      again: ['もういちど かざって くれるの？ ぷるるん！'],
      done: 'わあ、すてき！ ぷるるん ぷるるん！',
    },
  },
  {
    id: 'kumokumo', name: 'くもくもさん', icon: '☁️', bubble: '⭐', home: { x: -53, z: -57 }, island: 'kumo', play: 'stars',
    say: {
      ask: ['ふわあ… おほしさまが おちて、ねむれないの', 'しまに おちた ほしを 5つ ひろって きて', 'それから「ほしの だい」で、そらへ かえして ほしいな'],
      pad: ['ここが ほしの だい だよ', 'わっかが おおきく なった とき「えいっ」と おすと、ぴったり とどくよ'],
      again: ['また ほしが おちちゃった。ひろって くれる？'],
      done: 'おほしさまが もどった… ありがとう',
    },
  },
  {
    id: 'kaze', name: 'いたずらかぜ', icon: '🌀', bubble: '💨', home: { x: 55, z: -57 }, island: 'hoshi', play: 'chase',
    say: {
      ask: ['ぴゅー！ ブロックは ぼくが もらったよ〜', 'かえして ほしかったら、おいかけっこ だ！', 'ぼくに 4かい タッチ できたら きみの かち！ それっ！'],
      again: ['もういっかい おいかけっこ する？ まけないよ〜！'],
      done: 'つかまっちゃった〜！ でも たのしかった！ ブロックは かえすね',
    },
  },
  {
    id: 'moya', name: 'でかもやもや', icon: '🌫️', bubble: '💗', home: { x: 0, z: -109 }, island: 'moya', play: 'cheer',
    say: {
      ask: ['もやもや… みんな たのしそうで いいなあ', 'ぼくも なかまに いれて ほしくて、もやを だしちゃったんだ', 'ごめんね…'],
      done: 'みんな ありがとう！ もやもやが はれたよ！',
    },
  },
];
export const MAIN_IDS = ['chapu', 'kani', 'jelly', 'kumokumo', 'kaze'];

// ---- しまに すんでいる こ（ちいさな おねがい） ----
// item を しまの なかで need こ あつめると えがおに なる
// かずうさ（『かずうさガーデン』の ブロックの うさぎ）は、ブロックが あつまると せが のびる。base＝さいしょの ブロックの かず
export const RESIDENTS = [
  {
    id: 'popuri', name: 'ぽぷり', icon: '🦔', kind: 'popuri', home: { x: 9, z: -7 }, island: 'nohara',
    item: 'flower', itemName: 'にじいろの はな', spots: [{ x: -10, z: -16 }, { x: 15, z: 10 }, { x: -3, z: 12 }],
    say: { ask: ['にじいろの おはなで かんむりを つくりたいの', 'のはらで 3つ みつけて きて くれる？'], done: 'かんむりが できたよ！ ありがとう！' },
  },
  {
    id: 'gorota', name: 'ごろた', icon: '🐢', kind: 'gorota', home: { x: 46, z: -5 }, island: 'umibe',
    item: 'hitode', itemName: 'ひとで', spots: [{ x: 68, z: -8 }, { x: 52, z: -13 }, { x: 42, z: -1 }],
    say: { ask: ['のんびり… ひとでを ならべて あそびたいなあ', 'すなはまで 3つ ひろって きて ほしいな'], done: 'ひとでが そろった〜 うれしいなあ' },
  },
  {
    id: 'fuwari', name: 'ふわり', icon: '🐑', kind: 'fuwari', home: { x: -8, z: -60 }, island: 'okashi',
    item: 'wata', itemName: 'わたあめ', spots: [{ x: 7, z: -45 }, { x: -13, z: -54 }, { x: 0, z: -70 }],
    say: { ask: ['ふわふわの わたあめ、たべたいなあ', 'もりに 3つ あるんだ。もって きて くれる？'], done: 'ふわふわ〜 おいしい！ ありがとう' },
  },
  {
    id: 'san', name: 'さんちゃん', icon: '🐰', kind: 'bunny', home: { x: -59, z: -50 }, island: 'kumo', base: 1, color: 0xffd45e,
    item: 'block', itemName: 'ブロック', spots: [{ x: -47, z: -62 }, { x: -64, z: -45 }],
    say: { ask: ['わたし さんちゃん。ブロックが 3つ ないと げんきが でないの', 'もやで 2つ とんで いっちゃった。さがして くれる？'], done: 'ブロックが 3つ そろった！ げんき いっぱい！' },
  },
  {
    id: 'go', name: 'ごちゃん', icon: '🐰', kind: 'bunny', home: { x: 47, z: -49 }, island: 'hoshi', base: 1, color: 0x72cdf0,
    with: 'kaze', need: 4,
    say: { ask: ['ぼく ごちゃん。ブロックが 5つ あったのに…', 'いたずらかぜが 4つ もって いっちゃったんだ', 'かぜさんを つかまえて、とりかえして ほしいな'], done: 'ブロックが 5つ もどった！ ありがとう！' },
  },
];

// ひっこして くる かずうさ（エンディングの あと、1にちに ひとり）。n＝ブロックの かず。home は core が きめる
const BUNNY = [
  [1, 'いちちゃん', 0xff86c0, 'nohara'], [2, 'にちゃん', 0xffa48f, 'umibe'], [4, 'よんちゃん', 0x86dea0, 'okashi'], [6, 'ろくちゃん', 0xb29bff, 'kumo'],
  [7, 'ななちゃん', 0xff8fa3, 'hoshi'], [8, 'はちちゃん', 0xf28fe0, 'moya'], [9, 'きゅうちゃん', 0x8ea8ff, 'nohara'], [10, 'じゅうちゃん', 0xffd9ee, 'okashi'],
];
BUNNY.forEach(([n, name, color, island], i) => RESIDENTS.push({
  id: 'b' + n, name, icon: '🐰', kind: 'bunny', island, n, color, arrive: i + 1, home: { x: 0, z: 0 },
  item: 'block', itemName: 'ブロック', find: Math.min(n - 1, 4),
  say: n === 1
    ? { ask: ['ぼく いちちゃん。ひっこして きたよ！', 'これから よろしくね！'], done: 'よろしくね！' }
    : { ask: [`わたし ${name}。ひっこして きたよ！`, 'でも とちゅうで ブロックを おとしちゃった。さがして くれる？'], done: 'ブロックが そろった！ これから よろしくね！' },
}));
export const RAINBOW = [0xff8fa3, 0xffb36b, 0xffe066, 0x9ee493, 0x7fd0f5, 0xa39bff, 0xe79bff];
export const PEARL = [0xffd9ee, 0xe9dcff, 0xd6f1ff, 0xfff0cf, 0xdcfbe8];

// ---- まいにち（エンディングの あと） ----
// あさ、ともだち ふたりと すんでいる こ ひとりが「あそぼう」と まっている。ぜんぶ おわると ゆうがた。おうちで ねむると つぎの ひ
export const HOUSE = { x: 6.5, z: 4.5, r: 1.9 };
export const DAILY_RES = ['popuri', 'gorota', 'fuwari', 'san'];
export const DAY_TEXT = { morning: 'にちめの あさだよ！', evening: 'きょうも みんな えがお！', sleep: 'おやすみ…', bed: 'おうちに かえって ねむろう', castle: 'ブロックの おしろが できた！' };

// ---- ハート と おみせ ----
// えがおに すると ハートが もらえる。きせかえ（『かんじの しま』の もの）と しまの かざり（『かずうさガーデン』の もの）と こうかん できる
export const OUTFITS = [
  { id: 'head-none', slot: 'head', name: 'なし', icon: '・' },
  { id: 'ribbon', slot: 'head', name: 'リボン', icon: '🎀' }, { id: 'flower', slot: 'head', name: 'はなかんむり', icon: '🌼' },
  { id: 'strawberry', slot: 'head', name: 'いちごぼうし', icon: '🍓' }, { id: 'cloud', slot: 'head', name: 'くもぼうし', icon: '☁️' },
  { id: 'straw', slot: 'head', name: 'むぎわらぼうし', icon: '👒' }, { id: 'witch', slot: 'head', name: 'まじょの ぼうし', icon: '🧙' },
  { id: 'starpin', slot: 'head', name: 'ほしの ピン', icon: '⭐' }, { id: 'bunny', slot: 'head', name: 'うさみみ', icon: '🐰' },
  { id: 'tiara', slot: 'head', name: 'ティアラ', icon: '💎' }, { id: 'crown', slot: 'head', name: 'おうかん', icon: '👑' },
  { id: 'princess', slot: 'head', name: 'おひめさまぼうし', icon: '🏰' },
  { id: 'face-none', slot: 'face', name: 'なし', icon: '・' },
  { id: 'glasses', slot: 'face', name: 'まるめがね', icon: '👓' }, { id: 'hearts', slot: 'face', name: 'ハートめがね', icon: '💗' },
  { id: 'starcheek', slot: 'face', name: 'ほしの ほっぺ', icon: '✨' }, { id: 'starglasses', slot: 'face', name: 'ほしめがね', icon: '🤩' },
  { id: 'hige', slot: 'face', name: 'おひげ', icon: '🥸' },
  { id: 'back-none', slot: 'back', name: 'なし', icon: '・' },
  { id: 'randoseru', slot: 'back', name: 'ランドセル', icon: '🎒' }, { id: 'cape', slot: 'back', name: 'マント', icon: '🦸' },
  { id: 'balloon', slot: 'back', name: 'ふうせん', icon: '🎈' }, { id: 'angel', slot: 'back', name: 'てんしの はね', icon: '🪽' },
  { id: 'butterfly', slot: 'back', name: 'ちょうちょの はね', icon: '🦋' },
  { id: 'milk', slot: 'color', name: 'ミルク', icon: '🤍', color: 0xfff4f7 }, { id: 'pink', slot: 'color', name: 'さくら', icon: '🩷', color: 0xffc9dc },
  { id: 'mint', slot: 'color', name: 'ミント', icon: '💚', color: 0xc8f2dc }, { id: 'sky', slot: 'color', name: 'そら', icon: '🩵', color: 0xc9e8ff },
  { id: 'lemon', slot: 'color', name: 'レモン', icon: '💛', color: 0xfff1a8 }, { id: 'lavender', slot: 'color', name: 'ラベンダー', icon: '💜', color: 0xe2d4ff },
  { id: 'red', slot: 'color', name: 'あか', icon: '❤️', color: 0xff9a9a }, { id: 'blue', slot: 'color', name: 'あお', icon: '💙', color: 0x9cc8ff },
  { id: 'gold', slot: 'color', name: 'きんいろ', icon: '🌟', color: 0xffe08a }, { id: 'rainbow', slot: 'color', name: 'にじいろ', icon: '🌈', color: 0xffffff },
];
export const SLOTS = [{ id: 'head', name: 'あたま' }, { id: 'face', name: 'かお' }, { id: 'back', name: 'せなか' }, { id: 'color', name: 'いろ' }];
export const START_OWNED = ['head-none', 'face-none', 'back-none', 'milk'];
export const DEFAULT_OUTFIT = { head: 'head-none', face: 'face-none', back: 'back-none', color: 'milk' };
export const PRICE = { head: 4, face: 3, back: 5, color: 2, deco: 6 };
export const DECOS = [
  { id: 'flowerbed', name: 'おはなばたけ', icon: '🌷' }, { id: 'balloons', name: 'ハートの ふうせん', icon: '🎈' },
  { id: 'swing', name: 'ブランコ', icon: '🌳' }, { id: 'mushroom', name: 'きのこの おうち', icon: '🍄' },
  { id: 'slide', name: 'すべりだい', icon: '🛝' }, { id: 'teaset', name: 'おちゃかい', icon: '☕' },
  { id: 'fountain', name: 'ふんすい', icon: '⛲' }, { id: 'tent', name: 'おほしさま テント', icon: '⛺' },
  { id: 'icecream', name: 'アイスやさん', icon: '🍦' }, { id: 'heartarch', name: 'ハートの アーチ', icon: '💞' },
  { id: 'snowman', name: 'ゆきだるま', icon: '⛄' }, { id: 'cake', name: 'ケーキの おうち', icon: '🎂' },
  { id: 'carousel', name: 'メリーゴーランド', icon: '🎠' }, { id: 'hotair', name: 'ききゅう', icon: '🌤️' },
];
export const SHOP_TEXT = { title: 'おみせ', deco: 'しまの かざり', wear: 'きる', worn: 'きている', placed: 'かざった', short: 'ハートが たりないよ', full: 'かざる ばしょが いっぱい' };

// ---- アルバム ----
// くもくもさんの ほしは、とばす たびに ちがう せいざに なる（dx, y）
export const SKY_SHAPES = [
  { name: 'やまの せいざ', pts: [[-7, 13.5], [-3.2, 16.5], [0, 13], [3.2, 16.5], [7, 13.5]] },
  { name: 'ハートの せいざ', pts: [[-4.5, 16.5], [0, 14.6], [4.5, 16.5], [3, 12.6], [-3, 12.6]] },
  { name: 'おうかんの せいざ', pts: [[-6, 12.5], [-6, 16.5], [0, 14], [6, 16.5], [6, 12.5]] },
  { name: 'うさぎの せいざ', pts: [[-2.5, 18], [-1.5, 14.5], [1.5, 14.5], [2.5, 18], [0, 12.4]] },
  { name: 'にじの せいざ', pts: [[-7.5, 12.4], [-4.5, 15.6], [0, 17], [4.5, 15.6], [7.5, 12.4]] },
  { name: 'おさかなの せいざ', pts: [[-7, 16.5], [-3, 14.5], [-7, 12.6], [4, 16.6], [4, 12.6]] },
];
export const ALBUM_TEXT = { title: 'アルバム', sky: 'せいざ', jelly: 'ゼリーの さくひん', bunny: 'かずうさ', none: 'まだ ないよ' };

// がめんの うえに でる「いま する こと」
export const GOALS = {
  move: 'がめんを さわって ひっぱると あるけるよ',
  talk: 'に はなしかけよう',
  toBeach: 'はしを わたって はまべへ いこう',
  shells: 'なみが ひいたら かいがらを ひろおう',
  stars: 'しまに おちた ほしを ひろおう',
  pad: 'ほしの だいへ いこう',
  chase: 'いたずらかぜに タッチ しよう',
  find: 'を さがそう',
  guide: 'ちょうちょが みちを おしえて くれるよ',
  bed: 'おうちに かえって ねむろう',
  end: 'みんな えがお！ すきな ところで あそぼう',
};
export const FOG_CLEAR = 'もやが はれた！';
export const ENDING_TEXT = 'みんな えがおに なったよ！';

// ---- あそび ----
// かいがら：3つ ひろえば せいこう。にじいろの かいがら（なみが いちばん ひいた ときだけ でる）で はなまるが ふえる
export const SHELLS = [
  { ang: -2.05, d: 16.6 }, { ang: -1.57, d: 17.0 }, { ang: -1.1, d: 16.5 },
  { ang: -1.82, d: 14.3, rainbow: true }, { ang: -1.33, d: 14.2, rainbow: true },
];
export const SHELL_NEED = 3;
export const shellPos = (sh) => ({ x: SEA.x + Math.cos(sh.ang) * sh.d, z: SEA.z + Math.sin(sh.ang) * sh.d });
export const BEACH_SPOT = { x: 54, z: 4.5 };

// じゃんけん：3かい かてば せいこう。だす まえに カニの てが ちらっと みえる
export const HANDS = ['gu', 'choki', 'pa'];
export const BEATS = { gu: 'choki', choki: 'pa', pa: 'gu' };   // key が value に かつ
export const JANKEN_WINS = 3;
export const TELL_MS = [1300, 1000, 800, 650, 520, 430];
// あそびの とき、ぷにゅが たつ ばしょ（ともだちの ばしょから みて）
export const JANKEN_SPOT = { x: -4.1, z: 0.6 };
export const SIDE_SPOT = { x: -3.6, z: 1.2 };

// かざりつけ：3つ いじょう のせたら せいこう。ちゅうもんと おなじ ものが おおい ほど はなまるが ふえる
export const TOPPINGS = ['cream', 'ichigo', 'cherry', 'hoshi', 'choco'];
export const TOPPING_NAME = { cream: 'クリーム', ichigo: 'いちご', cherry: 'さくらんぼ', hoshi: 'ほし', choco: 'チョコ' };
export const DECO_MIN = 3;
export const DECO_MAX = 6;

// ほし：5つ ひろって、ほしの だいから そらへ とばす。わっかが おおきい ときに おすと「ぴったり」
export const STAR_SPOTS = [{ x: -45, z: -43 }, { x: -60, z: -63 }, { x: -41, z: -57 }, { x: -52, z: -40 }, { x: -65, z: -52 }];
export const STAR_RUNNER = 0;
export const STAR_RUN_TO = { x: -55, z: -65 };
export const STAR_NEED = 5;

// おいかけっこ：4かい タッチで せいこう。はやく つかまえる ほど はなまるが ふえる
export const CHASE_NEED = 4;
export const CHASE_SPEED = [5.2, 5.9, 6.5, 7.0];

// えがおを とどける：5かい
export const CHEER_NEED = 5;

// ---- きらきらのかけら ----
export const SHARDS = [
  { x: 6, z: 14 }, { x: -6, z: -13 }, { x: 15, z: -4 }, { x: -14, z: 13 }, { x: 3, z: -17 }, { x: -13, z: -3 },
  { x: 28, z: 0 }, { x: 44, z: -4 }, { x: 58, z: -15 }, { x: 69, z: 4 }, { x: 50, z: 5 }, { x: 62, z: 2 },
  { x: 0, z: -30 }, { x: -5, z: -44 }, { x: 13, z: -54 }, { x: -3, z: -64 },
  { x: -26, z: -54 }, { x: -52, z: -46 }, { x: -58, z: -60 }, { x: -43, z: -52 },
  { x: 54, z: -28 }, { x: 62, z: -57 }, { x: 50, z: -64 }, { x: 0, z: -83 },
];
export const SHARD_NAME = 'きらきらのかけら';

// ---- シール と おてがみ ----
export const STICKERS = [
  { id: 'chapu', icon: '🦦', name: 'ちゃぷシール' },
  { id: 'kani', icon: '🦀', name: 'かにシール' },
  { id: 'jelly', icon: '🍮', name: 'ゼリーシール' },
  { id: 'kumokumo', icon: '☁️', name: 'くもシール' },
  { id: 'kaze', icon: '🌀', name: 'かぜシール' },
  { id: 'moya', icon: '🌈', name: 'にじシール' },
  { id: 'popuri', icon: '🦔', name: 'ぽぷりシール' },
  { id: 'gorota', icon: '🐢', name: 'ごろたシール' },
  { id: 'fuwari', icon: '🐑', name: 'ふわりシール' },
  { id: 'san', icon: '🐰', name: 'さんちゃんシール' },
  { id: 'go', icon: '🐰', name: 'ごちゃんシール' },
];
export const LETTERS = [
  { id: 'chapu', from: 'ちゃぷ', icon: '🦦', text: 'かいがら いっしょに さがして くれて ありがとう' },
  { id: 'kani', from: 'おおきなカニ', icon: '🦀', text: 'じゃんけん たのしかったー！ また やろうね' },
  { id: 'jelly', from: 'ぷるるんゼリー', icon: '🍮', text: 'かざって くれて ありがとう。まいにち ぷるるん してるよ' },
  { id: 'kumokumo', from: 'くもくもさん', icon: '☁️', text: 'ほしが もどって ぐっすり ねむれるよ' },
  { id: 'kaze', from: 'いたずらかぜ', icon: '🌀', text: 'おいかけっこ さいこう！ もう いたずら しないよ' },
  { id: 'moya', from: 'でかもやもや', icon: '🌈', text: 'なかまに いれて くれて ありがとう。みんな だいすき！' },
];

// ---- うごき ----
export const SPEED = 8;
export const PLAYER_START = { x: 0, z: 9 };
export const TALK_R = 4.4;      // はなしかけ られる きょり
export const TOUCH_R = 1.7;     // かけら・かいがら などに ふれる きょり
export const FOLLOW_GAP = 2.4;  // ついてくる ともだちの あいだ
