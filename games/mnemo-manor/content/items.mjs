// 品物。絵にしやすい具体的な名詞だけにする（DESIGN.md 8章：イメージしやすいものほど場所法が効く）。
// cat は祭壇のダミー選び（同じカテゴリほど紛らわしい）に使う。

export const CATEGORIES = { animal: '生きもの', food: '食べもの', tool: '道具', toy: 'おもちゃ・楽器', wear: '身につけるもの' };

export const ITEMS = [
  { id: 'fish', name: '魚', emoji: '🐟', cat: 'animal' },
  { id: 'octopus', name: 'タコ', emoji: '🐙', cat: 'animal' },
  { id: 'frog', name: 'カエル', emoji: '🐸', cat: 'animal' },
  { id: 'turtle', name: 'カメ', emoji: '🐢', cat: 'animal' },
  { id: 'chicken', name: 'ニワトリ', emoji: '🐔', cat: 'animal' },
  { id: 'rabbit', name: 'ウサギ', emoji: '🐇', cat: 'animal' },
  { id: 'hedgehog', name: 'ハリネズミ', emoji: '🦔', cat: 'animal' },
  { id: 'snail', name: 'カタツムリ', emoji: '🐌', cat: 'animal' },

  { id: 'apple', name: 'リンゴ', emoji: '🍎', cat: 'food' },
  { id: 'banana', name: 'バナナ', emoji: '🍌', cat: 'food' },
  { id: 'bread', name: 'パン', emoji: '🍞', cat: 'food' },
  { id: 'cheese', name: 'チーズ', emoji: '🧀', cat: 'food' },
  { id: 'donut', name: 'ドーナツ', emoji: '🍩', cat: 'food' },
  { id: 'egg', name: 'たまご', emoji: '🥚', cat: 'food' },
  { id: 'watermelon', name: 'スイカ', emoji: '🍉', cat: 'food' },
  { id: 'mushroom', name: 'キノコ', emoji: '🍄', cat: 'food' },

  { id: 'key', name: '鍵', emoji: '🔑', cat: 'tool' },
  { id: 'scissors', name: 'ハサミ', emoji: '✂️', cat: 'tool' },
  { id: 'hammer', name: 'かなづち', emoji: '🔨', cat: 'tool' },
  { id: 'magnet', name: '磁石', emoji: '🧲', cat: 'tool' },
  { id: 'umbrella', name: '傘', emoji: '☂️', cat: 'tool' },
  { id: 'broom', name: 'ほうき', emoji: '🧹', cat: 'tool' },
  { id: 'alarm', name: '目覚まし時計', emoji: '⏰', cat: 'tool' },
  { id: 'compass', name: '方位磁針', emoji: '🧭', cat: 'tool' },

  { id: 'violin', name: 'バイオリン', emoji: '🎻', cat: 'toy' },
  { id: 'drum', name: '太鼓', emoji: '🥁', cat: 'toy' },
  { id: 'trumpet', name: 'ラッパ', emoji: '🎺', cat: 'toy' },
  { id: 'balloon', name: '風船', emoji: '🎈', cat: 'toy' },
  { id: 'wand', name: '魔法の杖', emoji: '🪄', cat: 'toy' },
  { id: 'teddy', name: 'くまのぬいぐるみ', emoji: '🧸', cat: 'toy' },
  { id: 'dice', name: 'サイコロ', emoji: '🎲', cat: 'toy' },
  { id: 'yoyo', name: 'ヨーヨー', emoji: '🪀', cat: 'toy' },

  { id: 'tophat', name: 'シルクハット', emoji: '🎩', cat: 'wear' },
  { id: 'boot', name: '長ぐつ', emoji: '👢', cat: 'wear' },
  { id: 'glove', name: '手ぶくろ', emoji: '🧤', cat: 'wear' },
  { id: 'glasses', name: 'めがね', emoji: '👓', cat: 'wear' },
  { id: 'scarf', name: 'マフラー', emoji: '🧣', cat: 'wear' },
  { id: 'ring', name: '指輪', emoji: '💍', cat: 'wear' },
  { id: 'sock', name: 'くつした', emoji: '🧦', cat: 'wear' },
  { id: 'crown', name: '王冠', emoji: '👑', cat: 'wear' },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
