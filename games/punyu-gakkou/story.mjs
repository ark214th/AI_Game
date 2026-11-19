// 1しゅうかんの おはなし と じかんわり（げつ〜きん。きんようびは ダンス はっぴょうかい）
// who：ぷにゅ・クラスメート・せんせい（pururun）。who が ない ぎょうは ナレーション
const T = 'pururun';

// じゅぎょう。id は がめんの なまえ、item は ランドセルに いれる もの
export const SUBJECTS = {
  draw: { name: 'おえかき', icon: '🖍️', item: 'crayon' },
  dance: { name: 'ダンス', icon: '💃', item: 'gym' },
  craft: { name: 'こうさく', icon: '✂️', item: 'scissors' },
  math: { name: 'さんすう', icon: '🔢', item: 'mathset' },
  kokugo: { name: 'こくご', icon: '📖', item: 'book' },
  costume: { name: 'こうさく', icon: '👑', item: 'scissors' },
  music: { name: 'おんがく', icon: '🎹', item: 'kenban' },
  race: { name: 'たいいく', icon: '🏃', item: 'gym' },
  rehearsal: { name: 'リハーサル', icon: '💃', item: 'gym' },
  recital: { name: 'はっぴょうかい', icon: '🎤', item: 'costumebag' },
};

export const DAY_NAMES = ['', 'げつようび', 'かようび', 'すいようび', 'もくようび', 'きんようび'];
export const DAY_SHORT = ['', 'げつ', 'か', 'すい', 'もく', 'きん'];

// periods：[1じかんめ, 2じかんめ, 3じかんめ]。arg は その じゅぎょうに わたす もの
export const DAYS = [
  null,
  {
    walkWith: 'fuwari',
    periods: [{ id: 'draw', arg: { theme: 'free' } }, { id: 'dance', arg: { song: 'kirakira' } }, { id: 'craft' }],
    recess: [{ sp: 'pokari', game: 'tag' }, { sp: 'popuri', game: 'rope' }],
    lunch: 1,
    morning: [
      'ぷにゅは ペットホテルで あった みんなと おなじ がっこうに かよう ことに なりました',
      'きょうは はじめての がっこう！',
      'あれれ… ぷにゅは まだ ねてるみたい。 ぷにゅを トントンして おこしてあげよう',
    ],
    walk: [{ who: 'fuwari', text: 'おはよう ぷにゅ！ いっしょに いこう！' }, { who: 'punyu', text: 'うん！ どきどき するな〜' }, { who: 'fuwari', text: 'だいじょうぶ！ クラスの みんな やさしいよ' }],
    hello: [
      { who: T, text: 'みなさん おはよう ございます！' },
      { text: 'みんな「おはよう ございまーす！」' },
      { who: T, text: 'きょうから あたらしい おともだちが きました。 ぷにゅ さんです！' },
      { who: 'punyu', text: 'ぷにゅ です！ よろしく ね！' },
      { who: 'kirara', text: 'あっ ペットホテルの ぷにゅ だ！' },
      { who: 'gorota', text: 'いっしょの クラス うれしいな〜' },
    ],
    board: 'ようこそ\nぷにゅ さん',
    bye: [
      { who: T, text: 'みなさんに おしらせが あります！' },
      { who: T, text: 'きんようびに ダンスの はっぴょうかいを します！ おうちの ひとも みにくるよ' },
      { text: 'みんな「やったー！」' },
      { who: 'punyu', text: 'ダンス だいすき！ いっぱい れんしゅう するぞ〜' },
      { who: 'chapu', text: 'はっぴょうかい… どきどき するなあ' },
    ],
    byeBoard: 'きんようびは\nダンス はっぴょうかい',
  },
  {
    walkWith: 'gorota',
    periods: [{ id: 'math' }, { id: 'dance', arg: { song: 'pop' } }, { id: 'draw', arg: { theme: 'poster' } }],
    recess: [{ sp: 'kirara', game: 'race' }, { sp: 'popuri', game: 'rope' }],
    lunch: 2,
    morning: [{ who: 'punyu', text: 'ふわぁ… かようび だ！' }, { who: 'punyu', text: 'きょうは きららの おたんじょうび なんだって。 はやく がっこうに いこう！' }],
    walk: [{ who: 'gorota', text: 'おはよう ぷにゅ〜' }, { who: 'gorota', text: 'きょうの きゅうしょく、 きららの おたんじょうびの ケーキが でるんだって' }, { who: 'punyu', text: 'わあ！ みんなで おいわい しようね！' }],
    hello: [
      { who: T, text: 'おはよう ございます！ きょうの じかんわりは… さんすう・ダンス・おえかき！' },
      { who: T, text: 'ダンスは あたらしい きょくを おどりますよ' },
      { who: 'kirara', text: 'わーい！ あたらしい きょく！' },
    ],
    board: 'さんすう\nダンス  おえかき',
    lunchEnd: [
      { who: T, text: 'きょうは きらら さんの おたんじょうび です！' },
      { text: 'みんな「きらら、 おたんじょうび おめでとう〜！」' },
      { who: 'kirara', text: 'みんな ありがとう！ すっごく うれしい〜！' },
    ],
    bye: [
      { who: 'kirara', text: 'きょうは さいこうの おたんじょうび だった！' },
      { who: T, text: 'みんなの ポスター、 たいいくかんに はっておくね' },
      { who: T, text: 'あしたは はっぴょうかいの いしょうを つくりますよ' },
      { who: 'punyu', text: 'いしょう！ たのしみ〜！' },
    ],
    byeBoard: 'きらら\nおたんじょうび おめでとう',
  },
  {
    walkWith: 'pokari',
    periods: [{ id: 'kokugo' }, { id: 'costume' }, { id: 'dance', arg: { song: 'final', part: 1 } }],
    recess: [{ sp: 'pokari', game: 'tag' }, { sp: 'kirara', game: 'race' }],
    lunch: 3,
    morning: [{ who: 'punyu', text: 'すいようび！ きょうは いしょうを つくる ひ！' }, { who: 'punyu', text: 'どんな いしょうに しようかな〜' }],
    walk: [{ who: 'pokari', text: 'ぷにゅ〜！ まってー！' }, { who: 'pokari', text: 'はっぴょうかいの きょく、 きょうから れんしゅう するんだって！' }, { who: 'punyu', text: 'ほんとう!? がんばろうね！' }],
    hello: [
      { who: T, text: 'おはよう ございます！ きょうは こくご・こうさく・ダンス です' },
      { who: T, text: 'こうさくでは はっぴょうかいの いしょうを つくります！' },
      { who: 'pokari', text: 'あっ… はさみ わすれちゃった…' },
      { who: 'punyu', text: 'ぽかり、 ぼくの はさみ いっしょに つかおう！' },
      { who: 'pokari', text: 'ありがとう ぷにゅ！' },
    ],
    board: 'こくご\nこうさく  ダンス',
    bye: [
      { who: T, text: 'はっぴょうかいの きょくは 「ぷにゅぷにゅ ダンス」！ あしたも れんしゅう しましょう' },
      { who: 'chapu', text: 'むずかしかったなあ… ぼく ちゃんと おどれるかな…' },
      { who: 'punyu', text: 'ちゃぷ…' },
    ],
    byeBoard: 'はっぴょうかいの きょく\nぷにゅぷにゅ ダンス',
  },
  {
    walkWith: 'chapu',
    periods: [{ id: 'music', arg: { song: 'tamb' } }, { id: 'race' }, { id: 'rehearsal', arg: { song: 'final' } }],
    recess: [{ sp: 'chapu', game: 'pair', arg: { song: 'kirakira', part: 1, partner: 'chapu' } }, { sp: 'pokari', game: 'tag' }],
    lunch: 4,
    morning: [{ who: 'punyu', text: 'もくようび… はっぴょうかいは あした だ！' }, { who: 'punyu', text: 'きのうの ちゃぷ、 げんき なかったな…' }],
    walk: [{ who: 'chapu', text: 'おはよう ぷにゅ…' }, { who: 'chapu', text: 'ぼく ダンス にがて なんだ。 あしたの はっぴょうかい、 しっぱい しちゃいそう…' }, { who: 'punyu', text: 'じゃあ やすみじかんに いっしょに れんしゅう しよう！' }, { who: 'chapu', text: 'ほんとう!? ありがとう！' }],
    hello: [
      { who: T, text: 'おはよう ございます！ きょうは おんがく・たいいく、 そして…' },
      { who: T, text: '3じかんめは はっぴょうかいの リハーサル です！' },
      { text: 'みんな「どきどき〜！」' },
    ],
    board: 'おんがく  たいいく\nリハーサル',
    bye: [
      { who: 'chapu', text: 'ぷにゅの おかげで ちゃんと おどれた！ あした がんばる！' },
      { who: T, text: 'あしたは いよいよ はっぴょうかい！ はやく ねて げんきに きてね' },
      { who: 'punyu', text: 'うん！ みんなで さいこうの ダンスに しよう！' },
    ],
    byeBoard: 'あしたは\nはっぴょうかい！',
  },
  {
    walkWith: 'popuri',
    friday: true,
    periods: [{ id: 'rehearsal', arg: { song: 'final', part: 1 } }, null, { id: 'recital', arg: { song: 'final' } }],
    recess: [{ sp: 'popuri', game: 'rope' }, { sp: 'kirara', game: 'race' }],
    lunch: 5,
    morning: [{ who: 'punyu', text: 'きんようび！ きょうは はっぴょうかい！' }, { who: 'punyu', text: 'どきどき… でも わくわく！ いってきます！' }],
    walk: [{ who: 'popuri', text: 'ぷにゅ〜！ きょうだね！' }, { who: 'popuri', text: 'わたし、 あさから ずっと ダンスの ことばかり かんがえてた！' }, { who: 'punyu', text: 'ぼくも！ みんなで たのしく おどろうね！' }],
    hello: [
      { who: T, text: 'みなさん、 いよいよ きょうは ダンス はっぴょうかい です！' },
      { who: T, text: 'ペットホテルの みんなも みにきて くれるそうです' },
      { text: 'みんな「わあ〜！」' },
      { who: T, text: '1じかんめに さいごの れんしゅうを して、 ごごが ほんばん ですよ！' },
    ],
    board: 'きょうは\nダンス はっぴょうかい',
    bye: [
      { who: T, text: 'みんな、 ほんとうに すてきな ダンス でした！' },
      { who: 'chapu', text: 'ぼく さいごまで おどれたよ！ ぷにゅ ありがとう！' },
      { who: 'punyu', text: 'みんなで おどれて たのしかった〜！' },
      { who: 'kirara', text: 'ねえねえ、 みんなで ぷにゅの おうちで おいわい しようよ！' },
      { text: 'みんな「さんせーい！」' },
    ],
    byeBoard: 'みんな\nはなまる！',
    party: true,
  },
];

// きゅうしょく（こんだて と みんなの ことば）
export const LUNCHES = [
  null,
  { board: 'きょうの こんだて\nカレー サラダ りんご', foods: [['curry', 'カレー', '🍛', 4], ['salad', 'サラダ', '🥗', 3], ['milk', 'ぎゅうにゅう', '🥛', 3], ['apple', 'りんご', '🍎', 2]],
    talk: { fuwari: 'カレー あまくちで よかった〜', gorota: 'サラダ しゃきしゃき！', pokari: 'カレー もっと からくても いいよ！', chapu: 'ぎゅうにゅう ごくごく！', popuri: 'りんご あまい〜！', kirara: 'きゅうしょく だいすき！' } },
  { board: 'きょうの こんだて\nスパゲッティ ケーキ', foods: [['pasta', 'スパゲッティ', '🍝', 4], ['salad', 'サラダ', '🥗', 3], ['milk', 'ぎゅうにゅう', '🥛', 3], ['cake', 'ケーキ', '🍰', 2]],
    talk: { fuwari: 'くるくる まいて たべるの すき！', gorota: 'ケーキ たのしみ〜', pokari: 'スパゲッティ つるつる！', chapu: 'ぎゅうにゅう ごくごく！', popuri: 'ケーキに いちごが のってる！', kirara: 'おたんじょうびの ケーキ だ〜！' } },
  { board: 'きょうの こんだて\nラーメン ぎょうざ', foods: [['ramen', 'ラーメン', '🍜', 4], ['gyoza', 'ぎょうざ', '🥟', 3], ['milk', 'ぎゅうにゅう', '🥛', 3], ['mikan', 'みかん', '🍊', 2]],
    talk: { fuwari: 'ふーふー あつあつ！', gorota: 'ぎょうざ もちもち〜', pokari: 'ラーメン だいすき！', chapu: 'みかん すっぱい！', popuri: 'ぎょうざ いくつ たべた？', kirara: 'なるとが かわいい！' } },
  { board: 'きょうの こんだて\nシチュー パン', foods: [['stew', 'シチュー', '🍲', 4], ['bread', 'パン', '🍞', 3], ['milk', 'ぎゅうにゅう', '🥛', 3], ['berry', 'いちご', '🍓', 2]],
    talk: { fuwari: 'シチュー ぽかぽか〜', gorota: 'パン ふわふわ！', pokari: 'パンを シチューに つけると おいしいよ', chapu: 'いっぱい たべて あした がんばる！', popuri: 'いちご だいすき！', kirara: 'おかわり したいな〜' } },
  { board: 'がんばれ\nおにぎり からあげ', foods: [['onigiri', 'おにぎり', '🍙', 3], ['karaage', 'からあげ', '🍗', 3], ['milk', 'ぎゅうにゅう', '🥛', 3], ['dango', 'だんご', '🍡', 2]],
    talk: { fuwari: 'いっぱい たべて げんき だそう！', gorota: 'からあげ さいこう！', pokari: 'ほんばん まえは おにぎり だよね！', chapu: 'どきどき して あんまり たべられない…', popuri: 'だんご もちもち〜', kirara: 'がんばろうね みんな！' } },
];

// はっぴょうかいを みにくる ペットホテルの みんな
export const AUDIENCE = ['kumokumo', 'kani', 'kaze', 'yukimi', 'ponta', 'piyo', 'pen', 'mitsuba', 'koron', 'dora'];
