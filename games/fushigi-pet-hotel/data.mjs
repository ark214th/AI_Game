// ゲームのデータ（お客さん・たべもの・あそび・家具・かべがみ・ゆか）
// 画面に出る字は ひらがな・カタカナ だけにする（漢字を使わない）

// かざりの「すきなもの」の しるし。wish は チェックインの ときの おねがい
export const TAGS = {
  kumo: { icon: '☁️', name: 'くも', wish: 'くも☁️の ある\nへやが いいな' },
  mizu: { icon: '💧', name: 'みずいろ', wish: 'みずいろ💧の\nへやが いいな' },
  hoshi: { icon: '⭐', name: 'ほし', wish: 'ほし⭐が ある\nへやが いいな' },
  iwa: { icon: '🪨', name: 'いわ', wish: 'いわ🪨の ある\nへやが いいな' },
  midori: { icon: '🌿', name: 'みどり', wish: 'みどり🌿が いっぱいの\nへやが いいな' },
  pinku: { icon: '🎀', name: 'ピンク', wish: 'ピンク🎀の\nへやが いいな' },
};

export const FOODS = [
  { id: 'apple', icon: '🍎', name: 'りんご' },
  { id: 'ame', icon: '🍭', name: 'にじいろアメ' },
  { id: 'cookie', icon: '🍪', name: 'いしころクッキー' },
];

export const TOYS = {
  ball: { name: 'ボール' },
  bubble: { name: 'しゃぼんだま' },
};

export const SPOTS = { atama: 'あたま', hoppe: 'ほっぺ', onaka: 'おなか' };

// ふきだしの え。ごはんは こたえを おしえないように おさらに する
export const NEEDS = {
  food: { icon: '🍽️', name: 'ごはん', say: 'おなか すいたな〜' },
  bath: { icon: '🫧', name: 'おふろ', say: 'からだが どろんこ…' },
  pet: { icon: '🤲', name: 'なでて', say: 'なでなで してほしいな' },
  play: { icon: '⚽', name: 'あそぼ', say: 'あそびたいな〜' },
  sleep: { icon: '🌙', name: 'ねむい', say: 'ふわぁ… ねむたい' },
};

// お客さん。くせ（すきな たべもの など）は ずかんで わかっていく
export const SPECIES = {
  fuwari: {
    name: 'ふわり', kind: 'くもの こ',
    fav: 'ame', dislike: 'cookie', spot: 'hoppe', bath: 'nigate', toy: 'bubble',
    likes: ['kumo', 'mizu', 'hoshi'],
    gifts: ['kumobed', 'hoshilamp', 'nijie', 'hoshikazari', 'wall:yozora', 'floor:kumo'],
    say: {
      arrive: 'こんにちは〜 ふわり です', fav: 'あまくて ふわふわ〜！', ok: 'もぐもぐ… おいしい', dislike: 'かたいの にがて〜',
      bathStart: 'おみず ちょっと にがて…', bathEnd: 'ぷるぷる… きれいに なった！', spot: 'ほっぺ すき〜', petEnd: 'ふわふわ しあわせ〜',
      room: 'このへや すてき！', roomMeh: 'うーん… ちょっと さみしいな', toyFav: 'しゃぼんだま だいすき！', toyOk: 'たのしいね〜',
      sleepEnd: 'おやすみ なさい…', bye: 'またね〜！ ふわふわ〜',
      idle: ['ふわ〜', 'きょうは いい てんき', 'くもに なって とびたいな'],
    },
  },
  gorota: {
    name: 'ごろた', kind: 'いしころの こ',
    fav: 'cookie', dislike: 'ame', spot: 'atama', bath: 'daisuki', toy: 'ball',
    likes: ['iwa', 'midori'],
    gifts: ['iwa', 'ueki', 'kinoko', 'wreath', 'wall:mori', 'floor:iwa', 'floor:kusa'],
    say: {
      arrive: 'ごろん。 ごろた だよ', fav: 'カリカリ！ さいこう！', ok: 'もぐ… うまい', dislike: 'あまいの… ぷいっ',
      bathStart: 'ゴシゴシ だいすき！', bathEnd: 'ピカピカの いしだ！', spot: 'あたまの こけ すき〜', petEnd: 'ごろごろ… いいきもち',
      room: 'おちつく へやだ〜', roomMeh: 'なんだか おちつかない…', toyFav: 'ボール まてまて〜！', toyOk: 'えいっ！',
      sleepEnd: 'ぐう…', bye: 'また ころがって くるね！',
      idle: ['ごろん', 'こけが のびたかな', 'ころころ〜'],
    },
  },
};
export const SPECIES_IDS = Object.keys(SPECIES);

// 家具。zone: floor（ゆかに おく）/ wall（かべに かける）。w,h は へやの中の大きさ。bed は ねる ところ
export const ITEMS = {
  bed: { name: 'ベッド', zone: 'floor', w: 250, h: 130, tags: [], bed: true },
  kumobed: { name: 'くもの ベッド', zone: 'floor', w: 260, h: 135, tags: ['kumo'], bed: true },
  rug: { name: 'まるい ラグ', zone: 'floor', flat: true, w: 300, h: 70, tags: [] },
  ueki: { name: 'うえき', zone: 'floor', w: 100, h: 180, tags: ['midori'] },
  iwa: { name: 'いわ', zone: 'floor', w: 160, h: 105, tags: ['iwa'] },
  kinoko: { name: 'きのこの いす', zone: 'floor', w: 110, h: 115, tags: ['midori'] },
  hoshilamp: { name: 'ほしの ランプ', zone: 'floor', w: 90, h: 210, tags: ['hoshi'] },
  doll: { name: 'ぷにゅの ぬいぐるみ', zone: 'floor', w: 95, h: 90, tags: ['pinku'] },
  window: { name: 'まど', zone: 'wall', w: 170, h: 150, tags: [] },
  nijie: { name: 'にじの え', zone: 'wall', w: 160, h: 115, tags: ['kumo'] },
  hoshikazari: { name: 'ほしの かざり', zone: 'wall', w: 290, h: 80, tags: ['hoshi'] },
  wreath: { name: 'はっぱの リース', zone: 'wall', w: 115, h: 115, tags: ['midori'] },
};

export const WALLS = {
  cream: { name: 'クリーム', tags: [] },
  pink: { name: 'ピンク', tags: ['pinku'] },
  mizu: { name: 'みずいろ', tags: ['mizu'] },
  mori: { name: 'もりいろ', tags: ['midori'] },
  yozora: { name: 'よぞら', tags: ['hoshi'] },
};

export const FLOORS = {
  wood: { name: 'きの ゆか', tags: [] },
  carpet: { name: 'ピンクの じゅうたん', tags: ['pinku'] },
  kusa: { name: 'くさはら', tags: ['midori'] },
  kumo: { name: 'くもの ゆか', tags: ['kumo'] },
  iwa: { name: 'いしだたみ', tags: ['iwa'] },
};

// へやの中の広さ（へやの よこはば 1000 に たいして）
export const ROOM = { w: 1000, h: 625, wallBottom: 380, floorTop: 400, floorBottom: 610, wallTop: 50, wallLow: 330 };

// へやが ふえる ハートの数（0,1 ばんめは はじめから ある）
export const ROOM_HEARTS = [0, 0, 12, 30, 55, 85, 120, 160, 205];
export const MAX_ROOMS = ROOM_HEARTS.length;
export const GUESTS_PER_DAY = 2;
export const LETTER_KEEP = 60;
