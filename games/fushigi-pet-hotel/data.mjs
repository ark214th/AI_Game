// ゲームのデータ（お客さん・たべもの・家具・かべがみ・ゆか）
// 画面に出る字は ひらがな・カタカナ だけにする（漢字を使わない）

// かざりの「すきなもの」の しるし
export const TAGS = {
  kumo: { icon: '☁️', name: 'くも' },
  mizu: { icon: '💧', name: 'みずいろ' },
  hoshi: { icon: '⭐', name: 'ほし' },
  iwa: { icon: '🪨', name: 'いわ' },
  midori: { icon: '🌿', name: 'みどり' },
  pinku: { icon: '🎀', name: 'ピンク' },
};

export const FOODS = [
  { id: 'apple', icon: '🍎', name: 'りんご' },
  { id: 'ame', icon: '🍭', name: 'にじいろアメ' },
  { id: 'cookie', icon: '🍪', name: 'いしころクッキー' },
];

export const SPOTS = { atama: 'あたま', hoppe: 'ほっぺ', onaka: 'おなか' };

export const NEEDS = {
  food: { icon: '🍎', name: 'ごはん' },
  bath: { icon: '🫧', name: 'おふろ' },
  pet: { icon: '🤲', name: 'なでて' },
};

// お客さん。くせ（すきな たべもの など）は ずかんで わかっていく
export const SPECIES = {
  fuwari: {
    name: 'ふわり', kind: 'くもの こ',
    fav: 'ame', dislike: 'cookie', spot: 'hoppe', bath: 'nigate',
    likes: ['kumo', 'mizu', 'hoshi'],
    gifts: ['kumobed', 'hoshilamp', 'nijie', 'hoshikazari', 'wall:yozora', 'floor:kumo'],
    say: { hello: 'ふわ〜 よろしくね', fav: 'あまくて ふわふわ〜！', ok: 'もぐもぐ… おいしい', dislike: 'かたいの にがて〜', bathStart: 'おみず ちょっと にがて…', bathEnd: 'ぷるぷる… きれいに なった！', spot: 'ほっぺ すき〜', petEnd: 'ふわふわ しあわせ〜', room: 'このへや すてき！' },
  },
  gorota: {
    name: 'ごろた', kind: 'いしころの こ',
    fav: 'cookie', dislike: 'ame', spot: 'atama', bath: 'daisuki',
    likes: ['iwa', 'midori'],
    gifts: ['iwa', 'ueki', 'kinoko', 'wreath', 'wall:mori', 'floor:iwa', 'floor:kusa'],
    say: { hello: 'ごろん。 よろしく', fav: 'カリカリ！ さいこう！', ok: 'もぐ… うまい', dislike: 'あまいの… ぷいっ', bathStart: 'ゴシゴシ だいすき！', bathEnd: 'ピカピカの いしだ！', spot: 'あたまの こけ すき〜', petEnd: 'ごろごろ… いいきもち', room: 'おちつく へやだ〜' },
  },
};
export const SPECIES_IDS = Object.keys(SPECIES);

// 家具。zone: floor（ゆかに おく）/ wall（かべに かける）。w,h は へやの中の大きさ
export const ITEMS = {
  bed: { name: 'ベッド', zone: 'floor', w: 250, h: 130, tags: [] },
  kumobed: { name: 'くもの ベッド', zone: 'floor', w: 260, h: 135, tags: ['kumo'] },
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
export const ROOM_HEARTS = [0, 0, 10, 25, 45];
export const MAX_ROOMS = ROOM_HEARTS.length;
export const GUESTS_PER_DAY = 2;
