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

// ランドセルに いれる もの。need は その ひの じかんわりで きまる（story.mjs の SUBJECTS）。say：いらない ものを えらんだ とき
export const BAG_ITEMS = [
  { id: 'crayon', name: 'クレヨン', icon: '🖍️' },
  { id: 'gym', name: 'たいそうふく', icon: '👕' },
  { id: 'scissors', name: 'はさみ', icon: '✂️' },
  { id: 'mathset', name: 'さんすうセット', icon: '🧮' },
  { id: 'book', name: 'こくごの ほん', icon: '📕' },
  { id: 'kenban', name: 'けんばんハーモニカ', icon: '🎹' },
  { id: 'costumebag', name: 'いしょう', icon: '👑' },
];
export const DECOYS = [
  { id: 'donut', name: 'ドーナツ', icon: '🍩', say: 'ドーナツは おうちで たべようね' },
  { id: 'teddy', name: 'ぬいぐるみ', icon: '🧸', say: 'ぬいぐるみは おるすばん！' },
  { id: 'ball', name: 'ボール', icon: '⚽', say: 'ボールは がっこうに あるよ' },
  { id: 'game', name: 'ゲームき', icon: '🎮', say: 'ゲームは かえってから！' },
  { id: 'candy', name: 'キャンディ', icon: '🍭', say: 'おかしは もっていかないよ' },
  { id: 'duck', name: 'おふろの アヒル', icon: '🦆', say: 'アヒルさんは おふろで まっててね' },
];

// やすみじかんの あそびの なまえ
export const GAME_NAMES = { tag: ['おにごっこ', '🏃'], rope: ['なわとび', '🪢'], race: ['かけっこ', '👟'], pair: ['ダンスの れんしゅう', '💃'] };
export const GAME_INVITE = { tag: 'おにごっこ しよう！', rope: 'なわとび しよう！', race: 'かけっこ しよう！', pair: 'ダンス おしえて…' };

// ダンスの ポーズ（ボタン）
export const POSES = [
  { id: 'up', name: 'ばんざい', color: '#ff7aa8' },
  { id: 'left', name: 'ひだり', color: '#ffb347' },
  { id: 'right', name: 'みぎ', color: '#5cc8ff' },
  { id: 'spin', name: 'くるり', color: '#a98bff' },
];

// ダンスの きょく。bars：しょうせつの ならび（pat の なまえ）。pat：[はく, ボタン]。
// music：chords（4しょうせつで ひとまわり）、mel（8ぶおんぷ 32こ）、style（たいこの かんじ）
export const SONGS = {
  kirakira: {
    name: 'きらきら ステップ', bpm: 100, lanes: 4,
    pat: { A: [[0, 0], [2, 0]], A2: [[0, 1], [2, 2]], B: [[0, 1], [1, 2], [2, 1], [3, 2]], C: [[0, 0], [1, 0], [2, 3]], D: [[0, 2], [1, 2], [2, 1], [3, 1]], E: [[0, 3], [2, 0], [3, 0]], F: [[0, 1], [0.5, 2], [1, 1], [2, 0], [3, 3]], G: [[0, 2], [0.5, 1], [1, 2], [2, 0], [3, 0]], END: [[0, 0]] },
    bars: ['A', 'A2', 'A', 'A2', 'B', 'C', 'B', 'E', 'D', 'C', 'D', 'E', 'F', 'C', 'G', 'E', 'END'],
    half: 9,
    chords: [[48, 64, 67, 72], [43, 62, 67, 71], [45, 64, 69, 72], [41, 65, 69, 72]],
    mel: [72, 0, 76, 0, 79, 76, 0, 72, 74, 0, 71, 0, 74, 79, 0, 0, 76, 0, 72, 0, 76, 81, 0, 79, 77, 0, 76, 74, 72, 0, 0, 0],
    melFrom: 4, octaveFrom: 12,
  },
  pop: {
    name: 'ぽっぷん ジャンプ', bpm: 112, lanes: 4,
    pat: { A: [[0, 1], [2, 2]], B: [[0, 0], [1, 0], [2, 3], [3, 3]], C: [[0, 1], [1, 2], [2, 1], [2.5, 2], [3, 0]], D: [[0, 2], [1, 1], [2, 2], [3, 1]], E: [[0, 0], [0.5, 0], [1, 3], [2, 1], [3, 2]], F: [[0, 3], [1, 0], [1.5, 0], [2, 3], [3, 0]], END: [[0, 3]] },
    bars: ['A', 'A', 'B', 'A', 'C', 'D', 'C', 'B', 'E', 'D', 'E', 'F', 'C', 'E', 'D', 'F', 'END'],
    half: 9,
    chords: [[45, 64, 69, 72], [41, 65, 69, 72], [48, 64, 67, 72], [43, 62, 67, 71]],
    mel: [76, 0, 76, 79, 0, 76, 74, 0, 72, 0, 72, 74, 76, 0, 0, 0, 77, 0, 77, 76, 0, 74, 72, 0, 74, 0, 79, 0, 76, 0, 0, 0],
    melFrom: 2, octaveFrom: 12, style: 'pop',
  },
  final: {
    name: 'ぷにゅぷにゅ ダンス', bpm: 104, lanes: 4,
    pat: {
      I: [[0, 0], [2, 3]], A: [[0, 1], [1, 1], [2, 2], [3, 2]], B: [[0, 0], [1, 3], [2, 0], [3, 3]],
      C: [[0, 1], [0.5, 2], [1, 1], [2, 0], [2.5, 0], [3, 3]], D: [[0, 2], [1, 1], [1.5, 2], [2, 0], [3, 0]],
      S: [[0, 3], [1, 3], [2, 0], [2.5, 1], [3, 2]], K: [[0, 0], [0.5, 1], [1, 2], [1.5, 3], [2, 0], [3, 0]], END: [[0, 3]],
    },
    bars: ['I', 'I', 'A', 'B', 'A', 'B', 'C', 'D', 'C', 'S', 'A', 'B', 'C', 'D', 'S', 'K', 'C', 'D', 'S', 'K', 'B', 'K', 'S', 'END'],
    half: 12,
    chords: [[48, 64, 67, 72], [45, 64, 69, 72], [41, 65, 69, 72], [43, 62, 67, 71]],
    mel: [72, 0, 74, 76, 0, 79, 0, 76, 81, 0, 79, 0, 76, 74, 0, 0, 77, 0, 76, 74, 0, 72, 0, 74, 76, 0, 74, 72, 74, 0, 79, 0],
    melFrom: 2, octaveFrom: 14, style: 'pop',
  },
  tamb: {
    name: 'けんばん ドレミ', bpm: 96, lanes: 2, kind: 'music',
    pat: { A: [[0, 0], [2, 0]], B: [[0, 0], [2, 1]], C: [[0, 0], [1, 1], [2, 0], [3, 1]], D: [[0, 1], [1, 1], [2, 0]], E: [[0, 0], [1, 0], [1.5, 1], [2, 0], [3, 1]], END: [[0, 0]] },
    bars: ['A', 'B', 'A', 'B', 'C', 'D', 'C', 'D', 'E', 'C', 'E', 'D', 'END'],
    half: 7,
    chords: [[48, 64, 67], [41, 65, 69], [43, 62, 67], [48, 64, 67]],
    mel: [72, 0, 0, 0, 79, 0, 0, 0, 76, 0, 0, 0, 72, 0, 0, 0, 77, 0, 0, 0, 74, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0],
    melFrom: 99, octaveFrom: 99, style: 'soft',
  },
};

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
  { id: 'taiko', price: 4 }, { id: 'yukidaruma', price: 4 }, { id: 'takarabako', price: 5 }, { id: 'hoshimado', price: 5 },
  { id: 'kumobed', price: 6 }, { id: 'danro', price: 6 }, { id: 'funsui', price: 8 }, { id: 'dragonlamp', price: 8 }, { id: 'throne', price: 8 },
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
