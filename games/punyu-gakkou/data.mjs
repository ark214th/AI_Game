// ぷにゅの がっこう：かずや ことばの データ（え は ペットホテルの draw.mjs を つかう）
import { SPECIES } from '../fushigi-pet-hotel/data.mjs';

// クラスメート（ペットホテルの おきゃくさん）。seat：きょうしつの せき
export const CLASSMATES = ['fuwari', 'gorota', 'pokari', 'chapu', 'popuri', 'kirara'];
export const nameOf = sp => sp === 'punyu' ? 'ぷにゅ' : sp === 'pururun' ? 'ぷるるん せんせい' : (SPECIES[sp]?.name || sp);
export const TEACHER = 'pururun';

// きがえ（ペットホテルの おしゃれ を あたまに つける）
export const OUTFITS = [
  { id: null, name: 'なし' },
  { id: 'ribbon', name: 'リボン' },
  { id: 'crown', name: 'はなかんむり' },
  { id: 'starpin', name: 'ほしの ピン' },
  { id: 'leafhat', name: 'はっぱの ぼうし' },
  { id: 'scarf', name: 'マフラー' },
  { id: 'shellpin', name: 'かいがらの ピン' },
];

// じかんわり（おためしばんの 1にちめ）
export const SCHEDULE = [
  { id: 'draw', name: 'おえかき', icon: '🖍️', item: 'crayon' },
  { id: 'dance', name: 'ダンス', icon: '💃', item: 'gym' },
  { id: 'craft', name: 'こうさく', icon: '✂️', item: 'scissors' },
];

// ランドセルに いれる もの。need：じかんわりで つかう
export const BAG_ITEMS = [
  { id: 'crayon', name: 'クレヨン', icon: '🖍️', need: true },
  { id: 'gym', name: 'たいそうふく', icon: '👕', need: true },
  { id: 'scissors', name: 'はさみ', icon: '✂️', need: true },
  { id: 'donut', name: 'ドーナツ', icon: '🍩', say: 'ドーナツは おうちで たべようね' },
  { id: 'teddy', name: 'ぬいぐるみ', icon: '🧸', say: 'ぬいぐるみは おるすばん！' },
  { id: 'ball', name: 'ボール', icon: '⚽', say: 'ボールは がっこうに あるよ' },
];

// きゅうしょく
export const LUNCH = [
  { id: 'curry', name: 'カレー', icon: '🍛', bites: 4 },
  { id: 'salad', name: 'サラダ', icon: '🥗', bites: 3 },
  { id: 'milk', name: 'ぎゅうにゅう', icon: '🥛', bites: 3 },
  { id: 'apple', name: 'りんご', icon: '🍎', bites: 2 },
];
export const LUNCH_TALK = {
  fuwari: 'カレー あまくちで よかった〜',
  gorota: 'サラダ しゃきしゃき！',
  pokari: 'カレー もっと からくても いいよ！',
  chapu: 'ぎゅうにゅう ごくごく！',
  popuri: 'りんご あまい〜！',
  kirara: 'きゅうしょく だいすき！',
};

// やすみじかんの あそび（あそんだ ともだちが ほうかごに あそびに くる）
export const RECESS = [
  { sp: 'pokari', game: 'tag', name: 'おにごっこ', invite: 'おにごっこ しよう！' },
  { sp: 'popuri', game: 'rope', name: 'なわとび', invite: 'なわとび しよう！' },
];

// ダンスの ポーズ（ボタン）
export const POSES = [
  { id: 'up', name: 'ばんざい', color: '#ff7aa8' },
  { id: 'left', name: 'ひだり', color: '#ffb347' },
  { id: 'right', name: 'みぎ', color: '#5cc8ff' },
  { id: 'spin', name: 'くるり', color: '#a98bff' },
];
export const DANCE_BPM = 100;

// こうさく
export const CRAFT_BASES = [
  { id: 'box', name: 'はこ' },
  { id: 'cup', name: 'かみコップ' },
  { id: 'ball', name: 'ねんど' },
];
export const CRAFT_COLORS = ['#ff8fab', '#ffd84a', '#8fd36a', '#7fc7ff', '#b58cff', '#ffb347', '#ffffff', '#c98b55'];
export const CRAFT_PARTS = [
  { id: 'eyes', name: 'め' },
  { id: 'mouth', name: 'くち' },
  { id: 'ears', name: 'みみ' },
  { id: 'horn', name: 'つの' },
  { id: 'star', name: 'ほし' },
  { id: 'heart', name: 'ハート' },
  { id: 'flower', name: 'おはな' },
  { id: 'ribbon', name: 'リボン' },
  { id: 'wheels', name: 'タイヤ' },
  { id: 'window', name: 'まど' },
  { id: 'antenna', name: 'アンテナ' },
  { id: 'wings', name: 'はね' },
];
export const CRAFT_MAX_PARTS = 14;

// おえかき
export const PEN_COLORS = ['#3a2a3a', '#ff5d6c', '#ff9f43', '#ffd84a', '#6cbf57', '#4fa8ff', '#a06cff', '#ff8fc8', '#8b5a3c', '#ffffff'];
export const PEN_SIZES = [6, 14, 28];

// シール（おかね の かわり）
export const STICKERS = { draw: 3, recess: 2, lunch: 1, craft: 3, danceBase: 1 };

// おみせ（ペットホテルの かぐ）。price：シールの かず
export const SHOP = [
  { id: 'cushion', price: 2 }, { id: 'kabin', price: 2 }, { id: 'ueki', price: 3 }, { id: 'kinoko', price: 3 },
  { id: 'table', price: 3 }, { id: 'hanakazari', price: 3 }, { id: 'hoshikazari', price: 3 }, { id: 'kazaguruma', price: 3 },
  { id: 'doll', price: 4 }, { id: 'hoshilamp', price: 4 }, { id: 'candylamp', price: 4 }, { id: 'hondana', price: 4 },
  { id: 'cakechair', price: 4 }, { id: 'tsukilamp', price: 4 }, { id: 'sofa', price: 5 }, { id: 'suisou', price: 5 },
];
export const FREE_WALLS = ['pink', 'cream', 'mizu', 'hana', 'okashi', 'yozora'];
export const FREE_FLOORS = ['wood', 'carpet', 'kusa', 'hanaf', 'kumo', 'hoshicarpet'];

// さいごに きく「いちばん たのしかった もの」
export const FEEDBACK = [
  { id: 'draw', name: 'おえかき', icon: '🖍️' },
  { id: 'dance', name: 'ダンス', icon: '💃' },
  { id: 'craft', name: 'こうさく', icon: '✂️' },
  { id: 'recess', name: 'やすみじかん', icon: '🏃' },
  { id: 'lunch', name: 'きゅうしょく', icon: '🍛' },
  { id: 'room', name: 'へやの かざりつけ', icon: '🛋️' },
];
