// ゲームのデータ（お客さん・たべもの・あそび・おしゃれ・家具・かべがみ・ゆか）
// 画面に出る字は ひらがな・カタカナ だけにする（漢字を使わない）

// かざりの「すきなもの」の しるし。wish は チェックインの ときの おねがい
export const TAGS = {
  kumo: { icon: '☁️', name: 'くも', wish: 'くも☁️の ある\nへやが いいな' },
  mizu: { icon: '💧', name: 'みずいろ', wish: 'みずいろ💧の\nへやが いいな' },
  hoshi: { icon: '⭐', name: 'ほし', wish: 'ほし⭐が ある\nへやが いいな' },
  iwa: { icon: '🪨', name: 'いわ', wish: 'いわ🪨の ある\nへやが いいな' },
  midori: { icon: '🌿', name: 'みどり', wish: 'みどり🌿が いっぱいの\nへやが いいな' },
  pinku: { icon: '🎀', name: 'ピンク', wish: 'ピンク🎀の\nへやが いいな' },
  hono: { icon: '🔥', name: 'あったか', wish: 'あったか🔥な\nへやが いいな' },
  umi: { icon: '🐚', name: 'うみ', wish: 'うみ🐚みたいな\nへやが いいな' },
  hana: { icon: '🌸', name: 'おはな', wish: 'おはな🌸が さいてる\nへやが いいな' },
  yoru: { icon: '🌙', name: 'よる', wish: 'よる🌙みたいな\nへやが いいな' },
  okashi: { icon: '🍰', name: 'おかし', wish: 'おかし🍰みたいな\nへやが いいな' },
  yuki: { icon: '❄️', name: 'ゆき', wish: 'ゆき❄️みたいな\nへやが いいな' },
};

export const FOODS = [
  { id: 'apple', icon: '🍎', name: 'りんご' },
  { id: 'ame', icon: '🍭', name: 'にじいろアメ' },
  { id: 'cookie', icon: '🍪', name: 'いしころクッキー' },
  { id: 'fish', icon: '🐟', name: 'おさかな' },
  { id: 'berry', icon: '🍓', name: 'いちご' },
  { id: 'honey', icon: '🍯', name: 'はちみつ' },
  { id: 'milk', icon: '🥛', name: 'ミルク' },
  { id: 'purin', icon: '🍮', name: 'プリン' },
  { id: 'donut', icon: '🍩', name: 'ドーナツ' },
  { id: 'onigiri', icon: '🍙', name: 'おにぎり' },
  { id: 'kakigori', icon: '🍧', name: 'かきごおり' },
  { id: 'banana', icon: '🍌', name: 'バナナ' },
  { id: 'carrot', icon: '🥕', name: 'にんじん' },
  { id: 'acorn', icon: '🌰', name: 'どんぐり' },
];

export const TOYS = {
  ball: { name: 'ボール', icon: '⚽' },
  bubble: { name: 'しゃぼんだま', icon: '🫧' },
};

// おしゃれ（あたまや くびに つける）
export const ACCS = {
  ribbon: { name: 'リボン', icon: '🎀' },
  crown: { name: 'はなかんむり', icon: '🌼' },
  starpin: { name: 'ほしの ピン', icon: '⭐' },
  leafhat: { name: 'はっぱの ぼうし', icon: '🍃' },
  scarf: { name: 'マフラー', icon: '🧣' },
  shellpin: { name: 'かいがらの ピン', icon: '🐚' },
};

export const SPOTS = { atama: 'あたま', hoppe: 'ほっぺ', onaka: 'おなか' };

// その子だけの おせわ
export const SPECIALS = {
  fluff: { icon: '🧶', name: 'ブラシ', need: 'もこもこに してほしいな', how: 'ブラシで こすって もこもこに！', done: 'もっこもこ〜！' },
  roll: { icon: '🔄', name: 'ころころ', need: 'ころころ したいな', how: 'ゆびで よこに シュッ！ ころがしてね', done: 'めが まわる〜 たのしい！' },
  fan: { icon: '🔥', name: 'ふーふー', need: 'しっぽの ひが ちいさいの…', how: 'しっぽの ちかくを トントン！ ふーふー', done: 'ぽっかぽか！' },
  shell: { icon: '🐚', name: 'かいがら', need: 'かいがらを さがして〜', how: 'かいがらを 3つ みつけてね', done: 'かいがら だいすき！' },
  water: { icon: '🌷', name: 'みずやり', need: 'おはなが のどかわいたって', how: 'じょうろを せなかに はこんでね', done: 'おはなが さいた〜！' },
  polish: { icon: '⭐', name: 'ほしみがき', need: 'しっぽの ほしを みがいて', how: 'しっぽの ほしを ゴシゴシ！', done: 'キラキラ〜！' },
  cream: { icon: '🍦', name: 'クリーム', need: 'あたまに クリーム のせて〜', how: 'あたまを トントン！ クリームを のせよう', done: 'ぷるるん！ おいしそう？' },
  stars: { icon: '🌟', name: 'ほしかぞえ', need: 'ほしを かぞえると ねむれるの…', how: 'ひかった ほしを タッチして かぞえよう', done: 'いつつ… むにゃ…' },
  janken: { icon: '✌️', name: 'じゃんけん', need: 'じゃんけん しよう！ チョキチョキ', how: 'グー・チョキ・パーを えらんでね', done: 'たのしかった〜！' },
  snowman: { icon: '⛄', name: 'ゆきだるま', need: 'ゆきだるま つくりたいな', how: 'ゆかを トントン！ ゆきだるまを つくろう', done: 'できた〜！ ゆきだるまさん！' },
  drum: { icon: '🥁', name: 'ポンポコ', need: 'おなかの たいこ ならして！', how: 'おなかを トントン！ ポンポコ ならそう', done: 'ポンポコ ポーン！ たのしい！' },
  nest: { icon: '🪺', name: 'すづくり', need: 'ふかふかの す が ほしいな', how: 'えだを タッチして あつめてね', done: 'ふかふかの す！ ぴよぴよ！' },
  slide: { icon: '🐧', name: 'すべりっこ', need: 'おなかで すべりたい！', how: 'ゆびで よこに シュッ！ すべらせてね', done: 'つるつる〜 たのしかった！' },
  honey: { icon: '🍯', name: 'はちみつ', need: 'はちみつ あつめ したいな', how: 'おはなを タッチして はちみつを あつめよう', done: 'つぼが いっぱい！ あまい〜！' },
  acorn: { icon: '🌰', name: 'どっちの て', need: 'どんぐり どっちの てに あるか な？', how: 'どっちの てに どんぐりが あるかな？', done: 'あそんでくれて ありがと！' },
  pinwheel: { icon: '🌀', name: 'かざぐるま', need: 'かざぐるまで あそびたい！', how: 'かざぐるまを ゆびで ぐるぐる！', done: 'ふーっ！ よく まわった〜！' },
};

// ふきだしの え。ごはんは こたえを おしえないように おさらに する
export const NEEDS = {
  food: { icon: '🍽️', name: 'ごはん', say: 'おなか すいたな〜' },
  bath: { icon: '🫧', name: 'おふろ', say: 'からだが どろんこ…' },
  pet: { icon: '🤲', name: 'なでて', say: 'なでなで してほしいな' },
  play: { icon: '⚽', name: 'あそぼ', say: 'あそびたいな〜' },
  dress: { icon: '🎀', name: 'おしゃれ', say: 'おしゃれ したいな♪' },
  special: { icon: '💫', name: 'とくべつ', say: '' },
  sleep: { icon: '🌙', name: 'ねむい', say: 'ふわぁ… ねむたい' },
};

// お客さん。くせ（すきな たべもの など）は ずかんで わかっていく
// room: 何へやめから くるか（ホテルが おおきく なると あたらしい 子が くる）
export const SPECIES = {
  fuwari: {
    name: 'ふわり', kind: 'くもの ひつじ', from: 0,
    fav: 'ame', dislike: 'cookie', spot: 'hoppe', bath: 'nigate', toy: 'bubble', acc: 'ribbon', special: 'fluff',
    likes: ['kumo', 'mizu', 'hoshi'],
    gifts: ['kumobed', 'hoshilamp', 'nijie', 'hoshikazari', 'cushion', 'wall:yozora', 'floor:kumo'],
    say: {
      arrive: 'めぇ〜 ふわり です', fav: 'あまくて ふわふわ〜！', ok: 'もぐもぐ… おいしい', dislike: 'かたいの にがて〜',
      bathStart: 'おみず ちょっと にがて…', bathEnd: 'ぷるぷる… きれいに なった！', spot: 'ほっぺ すき〜', petEnd: 'ふわふわ しあわせ〜',
      room: 'このへや すてき！', roomMeh: 'うーん… ちょっと さみしいな', toyFav: 'しゃぼんだま だいすき！', toyOk: 'たのしいね〜',
      sleepEnd: 'おやすみ なさい… めぇ', bye: 'またね〜！ めぇ〜',
      idle: ['めぇ〜', 'きょうは いい てんき', 'くもに なって とびたいな'],
    },
  },
  gorota: {
    name: 'ごろた', kind: 'こけの かめ', from: 0,
    fav: 'cookie', dislike: 'ame', spot: 'atama', bath: 'daisuki', toy: 'ball', acc: 'leafhat', special: 'roll',
    likes: ['iwa', 'midori'],
    gifts: ['iwa', 'ueki', 'kinoko', 'wreath', 'table', 'wall:mori', 'floor:iwa', 'floor:kusa'],
    say: {
      arrive: 'のそのそ… ごろた だよ', fav: 'カリカリ！ さいこう！', ok: 'もぐ… うまい', dislike: 'あまいの… ぷいっ',
      bathStart: 'ゴシゴシ だいすき！', bathEnd: 'こうらが ピカピカ！', spot: 'こうらの こけ すき〜', petEnd: 'のんびり… いいきもち',
      room: 'おちつく へやだ〜', roomMeh: 'なんだか おちつかない…', toyFav: 'ボール まてまて〜！', toyOk: 'えいっ！',
      sleepEnd: 'ぐう…', bye: 'また のそのそ くるね！',
      idle: ['のそのそ', 'こけが のびたかな', 'ゆっくりが いちばん'],
    },
  },
  pokari: {
    name: 'ぽかり', kind: 'ほのおの きつね', from: 3,
    fav: 'honey', dislike: 'fish', spot: 'atama', bath: 'nigate', toy: 'ball', acc: 'scarf', special: 'fan',
    likes: ['hono', 'iwa'],
    gifts: ['danro', 'sofa', 'hondana', 'cushion', 'wall:renga', 'floor:iwa'],
    say: {
      arrive: 'こんこん！ ぽかり だよ', fav: 'はちみつ とろ〜り！', ok: 'ぱくっ！ おいしい', dislike: 'ほねが こわい…',
      bathStart: 'しっぽの ひが きえちゃう〜', bathEnd: 'ふう… でも さっぱり！', spot: 'みみの うしろ すき〜', petEnd: 'ぽかぽか してきた',
      room: 'あったかい へや！', roomMeh: 'ちょっと さむいな…', toyFav: 'ボール とってくる！', toyOk: 'えいっ！',
      sleepEnd: 'こん… すや…', bye: 'また あそびに くるね！ こんこん',
      idle: ['こんこん', 'しっぽ ぽかぽか', 'はちみつ たべたいな'],
    },
  },
  chapu: {
    name: 'ちゃぷ', kind: 'うみの ラッコ', from: 4,
    fav: 'fish', dislike: 'honey', spot: 'onaka', bath: 'daisuki', toy: 'bubble', acc: 'shellpin', special: 'shell',
    likes: ['umi', 'mizu'],
    gifts: ['suisou', 'kaigara', 'rug', 'wall:umi', 'floor:suna'],
    say: {
      arrive: 'ちゃぷちゃぷ〜 ちゃぷです', fav: 'おさかな さいこう！', ok: 'もぐもぐ〜', dislike: 'べたべた いや〜',
      bathStart: 'おふろ だいすき〜！', bathEnd: 'ぷかぷか きもちいい〜', spot: 'おなか なでなで すき〜', petEnd: 'ちゃぷ〜 しあわせ',
      room: 'うみみたい！', roomMeh: 'うみが とおいな…', toyFav: 'しゃぼんだま〜！', toyOk: 'たのしい〜',
      sleepEnd: 'ぷかぷか… すや…', bye: 'また ながれて くるね〜！',
      idle: ['ちゃぷちゃぷ', 'かいがら どこかな', 'ぷかぷか〜'],
    },
  },
  popuri: {
    name: 'ぽぷり', kind: 'はなの はりねずみ', from: 5,
    fav: 'berry', dislike: 'cookie', spot: 'hoppe', bath: 'daisuki', toy: 'bubble', acc: 'crown', special: 'water',
    likes: ['hana', 'pinku', 'midori'],
    gifts: ['kabin', 'hanakazari', 'doll', 'ueki', 'wall:hana', 'floor:hanaf'],
    say: {
      arrive: 'こんにちは〜 ぽぷり です', fav: 'いちご あまずっぱい〜！', ok: 'おいしいね', dislike: 'かたいのは ちょっと…',
      bathStart: 'おはなも いっしょに あらってね', bathEnd: 'おはなが いきいき！', spot: 'ほっぺ ぷにぷに すき〜', petEnd: 'いい におい でしょ？',
      room: 'おはなばたけ みたい！', roomMeh: 'おはなが ないなぁ…', toyFav: 'しゃぼんだま きれい〜', toyOk: 'えへへ',
      sleepEnd: 'おはなも おやすみ…', bye: 'また さきに くるね〜！',
      idle: ['いい におい〜', 'おはな さいたかな', 'ふんふん♪'],
    },
  },
  kirara: {
    name: 'きらら', kind: 'ほしの ねこ', from: 6,
    fav: 'milk', dislike: 'apple', spot: 'onaka', bath: 'nigate', toy: 'ball', acc: 'starpin', special: 'polish',
    likes: ['hoshi', 'yoru'],
    gifts: ['tsukilamp', 'hoshimado', 'hoshikazari', 'cushion', 'floor:hoshicarpet', 'wall:yozora'],
    say: {
      arrive: 'にゃ〜ん きらら です', fav: 'ミルク だいすき にゃ！', ok: 'にゃむにゃむ', dislike: 'すっぱいの にゃ〜',
      bathStart: 'みず… にゃ…', bathEnd: 'ぶるぶる！ キラキラ にゃ', spot: 'おなか… とくべつ にゃ', petEnd: 'ごろごろ…',
      room: 'よるの そらみたい にゃ！', roomMeh: 'まぶしい にゃ…', toyFav: 'ボール まつにゃ〜！', toyOk: 'にゃっ！',
      sleepEnd: 'すぴー…', bye: 'また ながれぼしに のって くるにゃ',
      idle: ['にゃ〜', 'ほしが みたいにゃ', 'ごろごろ…'],
    },
  },
  // ホテルが いっぱいに なったら くる 子たち
  yukimi: {
    name: 'ゆきみ', kind: 'ゆきの うさぎ', from: 9,
    fav: 'kakigori', dislike: 'donut', spot: 'atama', bath: 'nigate', toy: 'bubble', acc: 'ribbon', special: 'snowman',
    likes: ['yuki', 'mizu'],
    gifts: ['yukidaruma', 'koorilamp', 'cushion', 'wall:yuki', 'floor:koori'],
    say: {
      arrive: 'しゃりしゃり… ゆきみ です', fav: 'かきごおり つめた〜い！', ok: 'もぐもぐ', dislike: 'あぶらっこいのは とけちゃう',
      bathStart: 'おゆは とけちゃう〜', bathEnd: 'ふう… ひんやり もどった', spot: 'みみの あいだ すき〜', petEnd: 'しゃりしゃり しあわせ',
      room: 'ゆきの くに みたい！', roomMeh: 'ちょっと あついかも…', toyFav: 'しゃぼんだま こおっちゃう？', toyOk: 'ぴょん！',
      sleepEnd: 'すや… しんしん…', bye: 'また ゆきと いっしょに くるね！',
      idle: ['しゃりしゃり', 'ゆき ふらないかな', 'ぴょんぴょん'],
    },
  },
  ponta: {
    name: 'ぽんた', kind: 'はっぱの たぬき', from: 9,
    fav: 'banana', dislike: 'ame', spot: 'onaka', bath: 'daisuki', toy: 'ball', acc: 'leafhat', special: 'drum',
    likes: ['midori', 'hono'],
    gifts: ['taiko', 'ueki', 'danro', 'floor:kusa'],
    say: {
      arrive: 'ポンポコ！ ぽんた だよ', fav: 'バナナ だいこうぶつ！', ok: 'もぐもぐ ポン', dislike: 'あまくて はが ポンポコ…',
      bathStart: 'ゆぶね だいすき ポン！', bathEnd: 'ピカピカ ポンポコ！', spot: 'おなか ポンポコ きもちいい', petEnd: 'ポン〜',
      room: 'もりの なか みたい ポン！', roomMeh: 'はっぱが ないと おちつかない', toyFav: 'ボール ポーン！', toyOk: 'ポン！',
      sleepEnd: 'ぐう… ポン…', bye: 'また ポンポコ くるね！',
      idle: ['ポンポコ', 'はっぱで へんしん！', 'おなか すいた ポン'],
    },
  },
  piyo: {
    name: 'ぴよこ', kind: 'たまごの ひよこ', from: 9,
    fav: 'apple', dislike: 'fish', spot: 'hoppe', bath: 'nigate', toy: 'bubble', acc: 'crown', special: 'nest',
    likes: ['hana', 'pinku'],
    gifts: ['su', 'kabin', 'hanakazari', 'floor:hanaf'],
    say: {
      arrive: 'ぴよっ！ ぴよこ です', fav: 'りんご あまずっぱい ぴよ！', ok: 'ついばみ ついばみ', dislike: 'おさかな こわい ぴよ…',
      bathStart: 'ぬれると ぺったんこ…', bathEnd: 'ふわふわに もどった！', spot: 'ほっぺ ぴよ〜', petEnd: 'ぴよぴよ しあわせ',
      room: 'おはなばたけ ぴよ！', roomMeh: 'おはなが みたいな…', toyFav: 'しゃぼんだま ぴよ〜！', toyOk: 'ぴよっ！',
      sleepEnd: 'ぴよ… すや…', bye: 'また ぴよぴよ くるね！',
      idle: ['ぴよ！', 'からが かゆい', 'ぴよぴよ〜'],
    },
  },
  pen: {
    name: 'ペンちゃん', kind: 'こおりの ペンギン', from: 9,
    fav: 'fish', dislike: 'banana', spot: 'onaka', bath: 'daisuki', toy: 'ball', acc: 'scarf', special: 'slide',
    likes: ['yuki', 'umi'],
    gifts: ['koorilamp', 'yukidaruma', 'suisou', 'floor:koori'],
    say: {
      arrive: 'ペタペタ… ペンちゃん です', fav: 'おさかな まるのみ！', ok: 'ごくん', dislike: 'バナナは すべって こわい',
      bathStart: 'みず だいすき！', bathEnd: 'つやつや！ ペタペタ', spot: 'おなか すべすべ でしょ', petEnd: 'ペタ〜',
      room: 'こおりの おしろ みたい！', roomMeh: 'ちょっと あついよ〜', toyFav: 'ボール ペタペタ おいかける！', toyOk: 'ペタッ！',
      sleepEnd: 'たったまま… すや…', bye: 'また ペタペタ くるね！',
      idle: ['ペタペタ', 'すべりたいな', 'おさかな どこ？'],
    },
  },
  mitsuba: {
    name: 'みつば', kind: 'はちみつの くま', from: 9,
    fav: 'honey', dislike: 'carrot', spot: 'hoppe', bath: 'daisuki', toy: 'ball', acc: 'ribbon', special: 'honey',
    likes: ['okashi', 'hana'],
    gifts: ['hachimitsu', 'kabin', 'cakechair', 'wall:hana'],
    say: {
      arrive: 'くまっ！ みつば だよ', fav: 'はちみつ〜！ とろとろ！', ok: 'もぐもぐ くまっ', dislike: 'にんじんは ちょっと…',
      bathStart: 'べたべた おとして〜', bathEnd: 'さらさら！ くまっ', spot: 'ほっぺ ふかふか', petEnd: 'くま〜 しあわせ',
      room: 'あまい においの へや！', roomMeh: 'おはなが ほしいな', toyFav: 'ボール まて〜 くまっ！', toyOk: 'くまっ！',
      sleepEnd: 'むにゃ… はちみつ…', bye: 'また あまい においで くるね！',
      idle: ['くまっ', 'はちみつ たべたい', 'ぶんぶん はちさん'],
    },
  },
  koron: {
    name: 'ころん', kind: 'どんぐりの りす', from: 9,
    fav: 'acorn', dislike: 'milk', spot: 'hoppe', bath: 'nigate', toy: 'ball', acc: 'leafhat', special: 'acorn',
    likes: ['midori', 'iwa'],
    gifts: ['donguri', 'kinoko', 'wreath', 'wall:mori'],
    say: {
      arrive: 'ころころ〜 ころん だよ', fav: 'どんぐり！ ほっぺに いっぱい！', ok: 'カリカリ', dislike: 'ミルクは ひげに つく〜',
      bathStart: 'しっぽが ぬれちゃう…', bathEnd: 'しっぽ ふっかふか！', spot: 'ほっぺ… どんぐり はいってるよ', petEnd: 'ころ〜ん',
      room: 'もりの おうち みたい！', roomMeh: 'きが ないなぁ', toyFav: 'ボール とってくる！', toyOk: 'ころっ！',
      sleepEnd: 'しっぽに くるまって… すや', bye: 'また ころころ くるね！',
      idle: ['ころころ', 'どんぐり かくそう', 'しっぽ ふわふわ'],
    },
  },
  // ぷにゅランドの ともだち（「ぷにゅの きらきらランド」の ボスたち）
  pururun: {
    name: 'ぷるるんゼリー', kind: 'ぷにゅランドの ともだち', land: true, from: 7,
    fav: 'purin', dislike: 'fish', spot: 'onaka', bath: 'daisuki', toy: 'bubble', acc: 'ribbon', special: 'cream',
    likes: ['okashi', 'pinku'],
    gifts: ['cakechair', 'candylamp', 'cushion', 'wall:okashi', 'floor:choco'],
    say: {
      arrive: 'ぷるるん！ あそびに きたよ', fav: 'プリン！ ぷるぷる なかま〜！', ok: 'ぷるん… おいしい', dislike: 'おさかなは ぷるぷる しないの',
      bathStart: 'ぴかぴかに なりたい！', bathEnd: 'つやつや ぷるるん！', spot: 'おなか ぷるぷる きもちいい〜', petEnd: 'ぷるるん しあわせ',
      room: 'おかしの おうち みたい！', roomMeh: 'あまい ものが ないなぁ', toyFav: 'しゃぼんだま ぷるん！', toyOk: 'ぷるん！',
      sleepEnd: 'ぷる… すや…', bye: 'また ぴょーんって くるね！',
      idle: ['ぷるるん', 'ぴょーん！', 'さくらんぼ おちてない？'],
    },
  },
  kumokumo: {
    name: 'くもくもさん', kind: 'ぷにゅランドの ともだち', land: true, from: 7,
    fav: 'milk', dislike: 'onigiri', spot: 'hoppe', bath: 'nigate', toy: 'bubble', acc: 'starpin', special: 'stars',
    likes: ['kumo', 'yoru'],
    gifts: ['kumobed', 'tsukilamp', 'hoshimado', 'floor:kumo'],
    say: {
      arrive: 'ふわぁ… くもくもです…', fav: 'あったかい ミルク… しあわせ…', ok: 'もぐ… むにゃ…', dislike: 'おなかが ずっしり しちゃう',
      bathStart: 'あめに なっちゃう〜', bathEnd: 'ふかふかに もどった…', spot: 'ほっぺ… ねむくなる…', petEnd: 'すぴー… はっ！',
      room: 'ねむれそうな へや…', roomMeh: 'まぶしくて ねむれない…', toyFav: 'しゃぼんだま… ふわふわ…', toyOk: 'ふわぁ',
      sleepEnd: 'すやぁ… zzz', bye: 'また ねむりに くるね… ふわぁ',
      idle: ['ふわぁ…', 'むにゃむにゃ', 'ねむい…'],
    },
  },
  kani: {
    name: 'おおきなカニ', kind: 'ぷにゅランドの ともだち', land: true, from: 8,
    fav: 'onigiri', dislike: 'ame', spot: 'atama', bath: 'daisuki', toy: 'ball', acc: 'shellpin', special: 'janken',
    likes: ['umi', 'iwa'],
    gifts: ['takarabako', 'kaigara', 'iwa', 'floor:suna'],
    say: {
      arrive: 'チョキチョキ！ カニだよ', fav: 'おにぎり だいすき チョキ！', ok: 'チョキ… うまい', dislike: 'べたべた して ハサミが くっつく',
      bathStart: 'あわあわ だいすき チョキ！', bathEnd: 'こうらが ピカピカ チョキ！', spot: 'あたま なでなで うれしい', petEnd: 'チョキ〜ん',
      room: 'すなはま みたい チョキ！', roomMeh: 'うみの においが しない…', toyFav: 'ボール まて〜 よこあるき！', toyOk: 'チョキ！',
      sleepEnd: 'ぶくぶく… すや…', bye: 'また よこあるきで くるね！',
      idle: ['チョキチョキ', 'よこあるき〜', 'かいがら ころころ'],
    },
  },
  kaze: {
    name: 'いたずらかぜ', kind: 'ぷにゅランドの ともだち', land: true, from: 8,
    fav: 'donut', dislike: 'apple', spot: 'hoppe', bath: 'nigate', toy: 'ball', acc: 'scarf', special: 'pinwheel',
    likes: ['kumo', 'hoshi'],
    gifts: ['kazaguruma', 'hoshikazari', 'nijie', 'wall:yozora'],
    say: {
      arrive: 'ひゅるる〜！ いたずらかぜ だよ', fav: 'ドーナツ くるくる！', ok: 'ひゅう… おいしい', dislike: 'すっぱい〜 ひゅるる',
      bathStart: 'みずは ちょっと にがて…', bathEnd: 'ふーっ！ かわかした！', spot: 'ほっぺ ぷくー', petEnd: 'ひゅるる〜ん',
      room: 'そらの うえ みたい！', roomMeh: 'かぜが とおらない へや…', toyFav: 'ボール ふきとばす〜！', toyOk: 'ひゅう！',
      sleepEnd: 'そよそよ… すや…', bye: 'また ふいて くるね〜！',
      idle: ['ひゅるる〜', 'いたずら しちゃおうかな', 'ほっぺ ぷくー'],
    },
  },
  // おおきな おきゃくさん（スイートルームに とまる）
  dora: {
    name: 'どらりん', kind: 'ドラゴンの あかちゃん', big: true, from: 99,
    fav: 'honey', dislike: 'milk', spot: 'onaka', bath: 'daisuki', toy: 'ball', acc: 'crown', special: null,
    likes: ['hono', 'hoshi', 'iwa'],
    gifts: ['dragonlamp'],
    say: {
      arrive: 'がおー！ どらりん だよ', fav: 'はちみつ おかわり！', ok: 'ばくばく！', dislike: 'ミルクは まだ はやいの',
      bathStart: 'おっきな おふろ！', bathEnd: 'うろこ ピカピカ！', spot: 'おなか くすぐったい〜', petEnd: 'がお〜ん…',
      room: 'おしろ みたい！', roomMeh: 'もっと キラキラが いいな', toyFav: 'ボール がおー！', toyOk: 'がおっ！',
      sleepEnd: 'ぐおー… すぴー…', bye: 'また とんで くるね！ がおー！',
      idle: ['がおー', 'はねが のびた！', 'ぼく つよいでしょ'],
    },
  },
  moya: {
    name: 'でかもやもや', kind: 'ぷにゅランドの おうさま', big: true, land: true, from: 99,
    fav: 'donut', dislike: 'onigiri', spot: 'atama', bath: 'daisuki', toy: 'ball', acc: 'ribbon', special: null,
    likes: ['hoshi', 'okashi', 'pinku'],
    gifts: ['throne'],
    say: {
      arrive: 'もや〜！ おうさまが きたぞ', fav: 'ドーナツ！ おうさまの おやつ！', ok: 'もやもや… うまい', dislike: 'のりが はに くっつく〜',
      bathStart: 'おうさまの おふろだ！', bathEnd: 'おうかんも ピカピカ！', spot: 'おうかんの したが きもちいい', petEnd: 'もや〜ん',
      room: 'おしろの へや みたい！', roomMeh: 'もっと キラキラが いいのう', toyFav: 'ボール！ おおジャンプだ！', toyOk: 'もやっ！',
      sleepEnd: 'もや… ぐう…', bye: 'また おしろから くるぞ！ もや〜',
      idle: ['もやもや〜', 'えっへん', 'おおジャンプ みせようか'],
    },
  },
  ku: {
    name: 'くーちゃん', kind: 'くじらの こ', big: true, from: 99,
    fav: 'fish', dislike: 'cookie', spot: 'atama', bath: 'daisuki', toy: 'bubble', acc: 'ribbon', special: null,
    likes: ['umi', 'mizu', 'kumo'],
    gifts: ['funsui'],
    say: {
      arrive: 'ぷしゅー！ くーちゃん です', fav: 'おさかな いっぱい〜！', ok: 'ごくん！', dislike: 'のどに つまる〜',
      bathStart: 'おふろ ひろ〜い！', bathEnd: 'ぷしゅー！ すっきり', spot: 'あたま なでなで〜', petEnd: 'ぷしゅ〜 しあわせ',
      room: 'うみの なか みたい！', roomMeh: 'うみが こいしいな', toyFav: 'しゃぼんだま ぷしゅー！', toyOk: 'たのし〜',
      sleepEnd: 'ぷしゅ… すや…', bye: 'また およいで くるね〜！',
      idle: ['ぷしゅー', 'うみの うた♪', 'ひろい へや〜'],
    },
  },
};
export const SPECIES_IDS = Object.keys(SPECIES);
export const NORMAL_IDS = SPECIES_IDS.filter(id => !SPECIES[id].big);
export const BIG_IDS = SPECIES_IDS.filter(id => SPECIES[id].big);

// 家具。zone: floor（ゆかに おく）/ wall（かべに かける）。w,h は へやの中の大きさ。bed は ねる ところ
// colors：タッチで かわる いろ（いろがえ）
export const ITEMS = {
  bed: { name: 'ベッド', zone: 'floor', w: 250, h: 130, tags: [], bed: true, colors: ['#ffb3c8', '#9fd3ff', '#b8e39a', '#ffd36b', '#c9b3ff'] },
  kumobed: { name: 'くもの ベッド', zone: 'floor', w: 260, h: 135, tags: ['kumo'], bed: true },
  bigbed: { name: 'おおきな ベッド', zone: 'floor', w: 420, h: 170, tags: [], bed: true, colors: ['#c9b3ff', '#ffb3c8', '#9fd3ff', '#ffd36b'] },
  rug: { name: 'まるい ラグ', zone: 'floor', flat: true, w: 300, h: 70, tags: [], colors: ['#ffcf7a', '#ff9fc0', '#9fd3ff', '#b8e39a', '#c9b3ff'] },
  ueki: { name: 'うえき', zone: 'floor', w: 100, h: 180, tags: ['midori'] },
  iwa: { name: 'いわ', zone: 'floor', w: 160, h: 105, tags: ['iwa'] },
  kinoko: { name: 'きのこの いす', zone: 'floor', w: 110, h: 115, tags: ['midori'], colors: ['#ff6a6a', '#ffb347', '#b58cff', '#5cc8ff'] },
  hoshilamp: { name: 'ほしの ランプ', zone: 'floor', w: 90, h: 210, tags: ['hoshi'] },
  tsukilamp: { name: 'つきの ランプ', zone: 'floor', w: 110, h: 200, tags: ['yoru'] },
  doll: { name: 'ぷにゅの ぬいぐるみ', zone: 'floor', w: 95, h: 90, tags: ['pinku'] },
  danro: { name: 'だんろ', zone: 'floor', w: 220, h: 200, tags: ['hono'] },
  sofa: { name: 'ソファ', zone: 'floor', w: 240, h: 120, tags: [], colors: ['#ff8fab', '#7fc7ff', '#8fd36a', '#ffb347', '#a98bff'] },
  table: { name: 'まるい テーブル', zone: 'floor', w: 150, h: 95, tags: [], colors: ['#c98b55', '#ffffff', '#ffb3c8', '#9fd3ff'] },
  cushion: { name: 'クッション', zone: 'floor', w: 110, h: 60, tags: [], colors: ['#ffd36b', '#ff9fc0', '#9fd3ff', '#b8e39a', '#c9b3ff'] },
  hondana: { name: 'ほんだな', zone: 'floor', w: 150, h: 200, tags: [], colors: ['#c98b55', '#ffffff', '#9fd3ff', '#ffb3c8'] },
  suisou: { name: 'すいそう', zone: 'floor', w: 170, h: 150, tags: ['umi', 'mizu'] },
  kaigara: { name: 'おおきな かいがら', zone: 'floor', w: 120, h: 90, tags: ['umi'], colors: ['#ffd6e2', '#fff1c9', '#d6ecff'] },
  kabin: { name: 'はなびん', zone: 'floor', w: 90, h: 150, tags: ['hana'], colors: ['#ff6f91', '#ffd84a', '#b58cff', '#5cc8ff'] },
  dragonlamp: { name: 'ドラゴンの ランプ', zone: 'floor', w: 140, h: 220, tags: ['hono', 'hoshi'], rare: true },
  funsui: { name: 'くじらの ふんすい', zone: 'floor', w: 200, h: 180, tags: ['umi', 'mizu'], rare: true },
  yukidaruma: { name: 'ゆきだるま', zone: 'floor', w: 120, h: 170, tags: ['yuki'] },
  koorilamp: { name: 'こおりの ランプ', zone: 'floor', w: 100, h: 190, tags: ['yuki', 'mizu'] },
  taiko: { name: 'たいこ', zone: 'floor', w: 130, h: 110, tags: ['hono'] },
  su: { name: 'ことりの す', zone: 'floor', w: 140, h: 80, tags: ['hana', 'midori'] },
  hachimitsu: { name: 'はちみつの つぼ', zone: 'floor', w: 110, h: 120, tags: ['okashi', 'hana'] },
  donguri: { name: 'どんぐりの かご', zone: 'floor', w: 130, h: 90, tags: ['midori', 'iwa'] },
  throne: { name: 'おうさまの いす', zone: 'floor', w: 160, h: 200, tags: ['hoshi', 'pinku'], rare: true },
  cakechair: { name: 'ケーキの いす', zone: 'floor', w: 120, h: 110, tags: ['okashi'] },
  candylamp: { name: 'キャンディの ランプ', zone: 'floor', w: 100, h: 200, tags: ['okashi', 'pinku'], colors: ['#ff8fab', '#7fc7ff', '#ffd84a', '#8fd36a'] },
  takarabako: { name: 'たからばこ', zone: 'floor', w: 150, h: 110, tags: ['umi'] },
  kazaguruma: { name: 'かざぐるま', zone: 'floor', w: 110, h: 190, tags: ['kumo'], colors: ['#ff8fab', '#7fc7ff', '#ffd84a', '#b58cff'] },
  window: { name: 'まど', zone: 'wall', w: 170, h: 150, tags: [], colors: ['#ffb3c8', '#9fd3ff', '#b8e39a', '#ffd36b'] },
  nijie: { name: 'にじの え', zone: 'wall', w: 160, h: 115, tags: ['kumo'] },
  hoshikazari: { name: 'ほしの かざり', zone: 'wall', w: 290, h: 80, tags: ['hoshi'] },
  wreath: { name: 'はっぱの リース', zone: 'wall', w: 115, h: 115, tags: ['midori'] },
  hanakazari: { name: 'はなの かざり', zone: 'wall', w: 290, h: 80, tags: ['hana', 'pinku'] },
  hoshimado: { name: 'ほしぞらの まど', zone: 'wall', w: 170, h: 170, tags: ['yoru', 'hoshi'] },
};

export const WALLS = {
  cream: { name: 'クリーム', tags: [] },
  pink: { name: 'ピンク', tags: ['pinku'] },
  mizu: { name: 'みずいろ', tags: ['mizu'] },
  mori: { name: 'もりいろ', tags: ['midori'] },
  yozora: { name: 'よぞら', tags: ['hoshi', 'yoru'] },
  renga: { name: 'レンガ', tags: ['hono'] },
  umi: { name: 'うみ', tags: ['umi'] },
  hana: { name: 'おはな', tags: ['hana'] },
  okashi: { name: 'おかし', tags: ['okashi'] },
  yuki: { name: 'ゆきげしき', tags: ['yuki'] },
};

export const FLOORS = {
  wood: { name: 'きの ゆか', tags: [] },
  carpet: { name: 'ピンクの じゅうたん', tags: ['pinku'] },
  kusa: { name: 'くさはら', tags: ['midori'] },
  kumo: { name: 'くもの ゆか', tags: ['kumo'] },
  iwa: { name: 'いしだたみ', tags: ['iwa'] },
  suna: { name: 'すなはま', tags: ['umi'] },
  hanaf: { name: 'はなばたけ', tags: ['hana'] },
  hoshicarpet: { name: 'ほしぞらの じゅうたん', tags: ['yoru'] },
  choco: { name: 'チョコの ゆか', tags: ['okashi'] },
  koori: { name: 'こおりの ゆか', tags: ['yuki'] },
};

// へやの中の広さ（へやの よこはば 1000 に たいして）
export const ROOM = { w: 1000, h: 625, wallBottom: 380, floorTop: 400, floorBottom: 610, wallTop: 50, wallLow: 330 };

// へやが ふえる ハートの数（0,1 ばんめは はじめから ある）
export const ROOM_HEARTS = [0, 0, 12, 30, 55, 85, 120, 160, 205];
export const MAX_ROOMS = ROOM_HEARTS.length;
export const SUITE_HEARTS = 70;      // スイートルームが できる
export const BIG_EVERY = 3;          // おおきな おきゃくさんが くる ひの まわりかた
export const NEW_WEIGHT = 3;         // まだ あって いない 子の でやすさ（ふつうの 子 = 1）
export const RECENT_WEIGHT = 0.3;    // きのう きた 子の でやすさ
export const GUESTS_PER_DAY = 2;
export const LETTER_KEEP = 60;
