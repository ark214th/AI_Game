// SHOPCRAFT のデータ：ブロック・売り物・お客さん。DOM を使わない（テストからも読む）。

// ---- テクスチャのタイル（textures.mjs が同じ順番で 16x16 を描く） ----
export const TILE_NAMES = [
  'grass_top', 'grass_side', 'dirt', 'stone', 'cobble', 'planks', 'planks_dark', 'planks_birch',
  'log_side', 'log_top', 'stone_bricks', 'bricks', 'glass', 'sand', 'plaster', 'roof_red',
  'roof_blue', 'leaves', 'path_top', 'path_side', 'bookshelf', 'glow', 'wool_red', 'wool_blue',
  'wool_yellow', 'wool_green', 'wool_white', 'wool_black', 'wool_pink', 'wool_orange', 'wool_cyan', 'wool_purple',
  'gold', 'diamond', 'emerald', 'barrel_side', 'barrel_top', 'iron', 'dark', 'screen',
  'flower_red', 'flower_yellow', 'flower_blue', 'pot', 'lantern', 'star', 'crystal', 'bedrock',
  'quartz', 'obsidian', 'tile_check', 'wool_brown',
];
export const TILE = Object.fromEntries(TILE_NAMES.map((n, i) => [n, i]));
export const ATLAS_SIZE = 16; // 16x16 タイル

// ---- ブロック ----
// shape: cube / cross（花）/ boxes（小さな箱の組み合わせ。単位は 1/16）
// solid: 体がぶつかる。walkTop: お客さんが上を歩ける。deco: かざりとして数える。light: 明かり。
export const BLOCKS = [];
export const B = {};
const def = (id, key, o) => {
  const shape = o.shape || 'cube';
  BLOCKS[id] = {
    id, key, shape,
    name: o.name,
    tiles: o.tiles,
    boxes: o.boxes || null,
    solid: o.solid ?? true,
    opaque: o.opaque ?? (shape === 'cube' && !o.transparent),
    transparent: !!o.transparent,
    light: !!o.light,
    deco: !!o.deco,
    walkTop: o.walkTop ?? (shape === 'cube'),
    faced: !!o.faced,
    cat: o.cat || null,
    gift: !!o.gift,
    special: o.special || null,
    color: o.color || '#888',
  };
  B[key] = id;
};

def(1, 'GRASS', {name: '草', tiles: {top: 'grass_top', side: 'grass_side', bottom: 'dirt'}, cat: 'build', color: '#6fae3f'});
def(2, 'DIRT', {name: '土', tiles: 'dirt', cat: 'build', color: '#8a5f3a'});
def(3, 'STONE', {name: '石', tiles: 'stone', cat: 'build', color: '#8b8b8b'});
def(4, 'COBBLE', {name: '丸石', tiles: 'cobble', cat: 'build', color: '#7a7a7a'});
def(5, 'PLANKS', {name: '木の板', tiles: 'planks', cat: 'build', color: '#b48a52'});
def(6, 'PLANKS_DARK', {name: 'こい 木の板', tiles: 'planks_dark', cat: 'build', color: '#6b4a2b'});
def(7, 'PLANKS_BIRCH', {name: '白い 木の板', tiles: 'planks_birch', cat: 'build', color: '#d8c690'});
def(8, 'LOG', {name: '丸太', tiles: {top: 'log_top', side: 'log_side', bottom: 'log_top'}, cat: 'build', color: '#6e5232'});
def(9, 'STONE_BRICKS', {name: '石レンガ', tiles: 'stone_bricks', cat: 'build', color: '#8a8a8a'});
def(10, 'BRICKS', {name: 'レンガ', tiles: 'bricks', cat: 'build', color: '#a5563f'});
def(11, 'GLASS', {name: 'ガラス', tiles: 'glass', transparent: true, cat: 'build', color: '#cfe8f0'});
def(12, 'SAND', {name: 'すな', tiles: 'sand', cat: 'build', color: '#dccf94'});
def(13, 'PLASTER', {name: '白い かべ', tiles: 'plaster', cat: 'build', color: '#eeeae0'});
def(14, 'ROOF_RED', {name: '赤い 屋根', tiles: 'roof_red', cat: 'build', color: '#b8442f'});
def(15, 'ROOF_BLUE', {name: '青い 屋根', tiles: 'roof_blue', cat: 'build', color: '#3b5fa8'});
def(16, 'LEAVES', {name: '葉っぱ', tiles: 'leaves', transparent: true, cat: 'build', color: '#3f8a2c'});
def(17, 'PATH', {name: '道', tiles: {top: 'path_top', side: 'path_side', bottom: 'dirt'}, cat: 'build', color: '#a08a5a'});
def(18, 'BOOKSHELF', {name: '本だな', tiles: {top: 'planks', side: 'bookshelf', bottom: 'planks'}, deco: true, cat: 'deco', color: '#8a5f3a'});
def(19, 'GLOW', {name: '光る ブロック', tiles: 'glow', light: true, cat: 'deco', color: '#ffd96a'});
def(20, 'WOOL_RED', {name: '赤', tiles: 'wool_red', cat: 'color', color: '#c53a32'});
def(21, 'WOOL_BLUE', {name: '青', tiles: 'wool_blue', cat: 'color', color: '#3550b0'});
def(22, 'WOOL_YELLOW', {name: '黄色', tiles: 'wool_yellow', cat: 'color', color: '#f0c829'});
def(23, 'WOOL_GREEN', {name: '緑', tiles: 'wool_green', cat: 'color', color: '#4f9a2e'});
def(24, 'WOOL_WHITE', {name: '白', tiles: 'wool_white', cat: 'color', color: '#ececec'});
def(25, 'WOOL_BLACK', {name: '黒', tiles: 'wool_black', cat: 'color', color: '#262630'});
def(26, 'WOOL_PINK', {name: 'ピンク', tiles: 'wool_pink', cat: 'color', color: '#ee8fb0'});
def(27, 'WOOL_ORANGE', {name: 'オレンジ', tiles: 'wool_orange', cat: 'color', color: '#ec8a2a'});
def(28, 'WOOL_CYAN', {name: '水色', tiles: 'wool_cyan', cat: 'color', color: '#55c2dc'});
def(29, 'WOOL_PURPLE', {name: 'むらさき', tiles: 'wool_purple', cat: 'color', color: '#8445b5'});
def(30, 'WOOL_BROWN', {name: '茶色', tiles: 'wool_brown', cat: 'color', color: '#7a5030'});
def(31, 'QUARTZ', {name: 'すべすべ ブロック', tiles: 'quartz', cat: 'build', color: '#f2efe8'});
def(32, 'OBSIDIAN', {name: '黒い 石', tiles: 'obsidian', cat: 'build', color: '#22182e'});
def(33, 'TILE_CHECK', {name: 'タイル', tiles: 'tile_check', cat: 'build', color: '#ddd'});
def(34, 'BARREL', {name: 'たる', tiles: {top: 'barrel_top', side: 'barrel_side', bottom: 'barrel_top'}, deco: true, cat: 'deco', color: '#8a6038'});
def(35, 'BEDROCK', {name: 'かたい 石', tiles: 'bedrock', color: '#444'});

// プレゼントで もらえる ブロック
def(40, 'GOLD', {name: '金ブロック', tiles: 'gold', deco: true, gift: true, cat: 'gift', color: '#f5d442'});
def(41, 'DIAMOND', {name: 'ダイヤ ブロック', tiles: 'diamond', deco: true, gift: true, cat: 'gift', color: '#4ee6dc'});
def(42, 'EMERALD', {name: 'エメラルド', tiles: 'emerald', deco: true, gift: true, cat: 'gift', color: '#2fcf6a'});
def(43, 'STAR', {name: '星の ブロック', tiles: 'star', light: true, deco: true, gift: true, cat: 'gift', color: '#ffe46a'});
def(44, 'CRYSTAL', {name: 'クリスタル', tiles: 'crystal', light: true, deco: true, gift: true, transparent: true, cat: 'gift', color: '#c79bff'});

// ---- 箱でできた ブロック（店・かざり） ----
const bx = (x0, y0, z0, x1, y1, z1, t) => ({b: [x0, y0, z0, x1, y1, z1], t});
def(50, 'SHELF', {
  name: 'たな', shape: 'boxes', special: 'shelf', faced: true, cat: 'shop', color: '#8a6038',
  boxes: [bx(0, 0, 0, 16, 10, 16, {top: 'planks', side: 'planks_dark', bottom: 'planks_dark'}), bx(0, 10, 0, 16, 16, 2, 'planks_dark')],
});
def(51, 'REGISTER', {
  name: 'レジ', shape: 'boxes', special: 'register', faced: true, cat: 'shop', color: '#555',
  boxes: [
    bx(0, 0, 0, 16, 10, 16, {top: 'planks_birch', side: 'planks_dark', bottom: 'planks_dark'}),
    bx(3, 10, 3, 13, 14, 12, 'iron'), bx(3, 10, 12, 13, 12, 14, 'gold'), bx(4, 14, 4, 12, 19, 6, 'screen'),
  ],
});
def(52, 'SIGN', {
  name: 'かんばん', shape: 'boxes', special: 'sign', faced: true, cat: 'shop', color: '#b48a52',
  boxes: [bx(7, 0, 7, 9, 8, 9, 'log_side'), bx(0, 6, 7, 16, 16, 9, 'planks')],
});
def(53, 'DOOR', {name: 'ドア', shape: 'door', special: 'door', solid: false, faced: true, walkTop: false, cat: 'shop', color: '#8a6038'});
def(54, 'DOOR_TOP', {name: 'ドア', shape: 'none', special: 'doorTop', solid: false, walkTop: false, color: '#8a6038'});
def(55, 'LANTERN', {
  name: 'ランタン', shape: 'boxes', light: true, deco: true, solid: false, cat: 'shop', color: '#ffd96a',
  boxes: [bx(5, 0, 5, 11, 1, 11, 'dark'), bx(5, 1, 5, 11, 8, 11, 'lantern'), bx(6, 8, 6, 10, 10, 10, 'dark'), bx(7, 10, 7, 9, 12, 9, 'dark')],
});
def(56, 'TABLE', {
  name: 'テーブル', shape: 'boxes', deco: true, cat: 'deco', color: '#d8c690',
  boxes: [bx(0, 13, 0, 16, 16, 16, 'planks_birch'), bx(6, 0, 6, 10, 13, 10, 'log_side')],
});
def(57, 'CHAIR', {
  name: 'いす', shape: 'boxes', deco: true, faced: true, cat: 'deco', color: '#b48a52',
  boxes: [bx(2, 7, 2, 14, 9, 14, 'planks'), bx(2, 0, 2, 4, 7, 4, 'planks_dark'), bx(12, 0, 2, 14, 7, 4, 'planks_dark'),
    bx(2, 0, 12, 4, 7, 14, 'planks_dark'), bx(12, 0, 12, 14, 7, 14, 'planks_dark'), bx(2, 9, 2, 14, 20, 4, 'planks')],
});
def(58, 'CARPET_RED', {name: '赤い じゅうたん', shape: 'boxes', deco: true, solid: false, cat: 'deco', color: '#c53a32', boxes: [bx(0, 0, 0, 16, 1, 16, 'wool_red')]});
def(59, 'CARPET_BLUE', {name: '青い じゅうたん', shape: 'boxes', deco: true, solid: false, cat: 'deco', color: '#3550b0', boxes: [bx(0, 0, 0, 16, 1, 16, 'wool_blue')]});
def(60, 'FLOWER_RED', {name: '赤い 花', shape: 'cross', tiles: 'flower_red', deco: true, solid: false, cat: 'deco', color: '#e04040'});
def(61, 'FLOWER_YELLOW', {name: '黄色い 花', shape: 'cross', tiles: 'flower_yellow', deco: true, solid: false, cat: 'deco', color: '#f0d030'});
def(62, 'FLOWER_BLUE', {name: '青い 花', shape: 'cross', tiles: 'flower_blue', deco: true, solid: false, cat: 'deco', color: '#5070e0'});
def(63, 'POT', {
  name: '植木ばち', shape: 'boxes', deco: true, cat: 'deco', color: '#b8643a',
  boxes: [bx(4, 0, 4, 12, 6, 12, 'pot'), bx(3, 6, 3, 13, 15, 13, 'leaves')],
});
def(64, 'FENCE', {
  name: '木の さく', shape: 'boxes', cat: 'build', color: '#b48a52',
  boxes: [bx(6, 0, 6, 10, 16, 10, 'planks'), bx(0, 6, 7, 16, 9, 9, 'planks'), bx(0, 12, 7, 16, 15, 9, 'planks'),
    bx(7, 6, 0, 9, 9, 16, 'planks'), bx(7, 12, 0, 9, 15, 16, 'planks')],
});
def(65, 'STAIRS_WOOD', {
  name: '木の かいだん', shape: 'boxes', faced: true, walkTop: true, cat: 'build', color: '#b48a52',
  boxes: [bx(0, 0, 0, 16, 8, 16, 'planks'), bx(0, 8, 0, 16, 16, 8, 'planks')],
});
def(66, 'STAIRS_STONE', {
  name: '石の かいだん', shape: 'boxes', faced: true, walkTop: true, cat: 'build', color: '#8a8a8a',
  boxes: [bx(0, 0, 0, 16, 8, 16, 'stone_bricks'), bx(0, 8, 0, 16, 16, 8, 'stone_bricks')],
});
def(67, 'TROPHY', {
  name: 'トロフィー', shape: 'boxes', deco: true, gift: true, cat: 'gift', color: '#f5d442',
  boxes: [bx(4, 0, 4, 12, 2, 12, 'obsidian'), bx(7, 2, 7, 9, 6, 9, 'gold'), bx(4, 6, 4, 12, 13, 12, 'gold'),
    bx(2, 8, 7, 4, 12, 9, 'gold'), bx(12, 8, 7, 14, 12, 9, 'gold')],
});
def(68, 'BANNER_RED', {
  name: '赤い はた', shape: 'boxes', deco: true, gift: true, faced: true, solid: false, cat: 'gift', color: '#c53a32',
  boxes: [bx(7, 0, 4, 9, 30, 6, 'log_side'), bx(1, 28, 3, 15, 30, 5, 'log_side'), bx(2, 10, 5, 14, 28, 6, 'wool_red'), bx(6, 18, 6, 10, 22, 7, 'gold')],
});
def(69, 'BANNER_BLUE', {
  name: '青い はた', shape: 'boxes', deco: true, gift: true, faced: true, solid: false, cat: 'gift', color: '#3550b0',
  boxes: [bx(7, 0, 4, 9, 30, 6, 'log_side'), bx(1, 28, 3, 15, 30, 5, 'log_side'), bx(2, 10, 5, 14, 28, 6, 'wool_blue'), bx(6, 18, 6, 10, 22, 7, 'wool_white')],
});
def(70, 'ARMOR_STAND', {
  name: 'よろい かざり', shape: 'boxes', deco: true, gift: true, faced: true, cat: 'gift', color: '#d8d8d8',
  boxes: [bx(2, 0, 2, 14, 1, 14, 'stone_bricks'), bx(7, 1, 7, 9, 8, 9, 'planks'), bx(3, 8, 5, 13, 19, 11, 'iron'),
    bx(1, 15, 6, 3, 19, 10, 'iron'), bx(13, 15, 6, 15, 19, 10, 'iron'), bx(5, 19, 5, 11, 25, 11, 'iron'), bx(6, 21, 11, 10, 22, 12, 'dark')],
});
def(71, 'THRONE', {
  name: '王様の いす', shape: 'boxes', deco: true, gift: true, faced: true, cat: 'gift', color: '#c53a32',
  boxes: [bx(1, 0, 1, 15, 8, 15, 'gold'), bx(2, 8, 2, 14, 10, 14, 'wool_red'), bx(1, 8, 1, 15, 28, 4, 'gold'), bx(3, 10, 4, 13, 26, 5, 'wool_red'),
    bx(1, 8, 4, 3, 14, 15, 'gold'), bx(13, 8, 4, 15, 14, 15, 'gold'), bx(6, 26, 1, 10, 31, 4, 'diamond')],
});

export const BLOCK_COUNT = BLOCKS.length;
export const isShopBlock = id => !!BLOCKS[id]?.special;

// インベントリの タブ
export const INV_TABS = [
  {key: 'build', name: 'たてもの'},
  {key: 'color', name: '色'},
  {key: 'shop', name: '店'},
  {key: 'deco', name: 'かざり'},
  {key: 'gift', name: 'プレゼント'},
];

// ---- 売り物 ----
// icon: アイコンの かたち（textures.mjs）。pal: 色。cost: 仕入れで 出すのに いる コイン。level: 町の レベル。
export const CATS = {
  food: '食べ物', weapon: 'ぶき', armor: 'ぼうぐ', tool: 'どうぐ', magic: 'まほう',
};
const BLADE = {
  wood: {B: '#a87a40', W: '#d4a560', D: '#6e4e26'},
  stone: {B: '#8c8c8c', W: '#bdbdbd', D: '#5d5d5d'},
  iron: {B: '#d6d6d6', W: '#ffffff', D: '#979797'},
  gold: {B: '#f5d442', W: '#fff6a8', D: '#c79a16'},
  diamond: {B: '#4ee6dc', W: '#d0fffa', D: '#1aa89f'},
};
export const ITEMS = [
  {key: 'bread', name: 'パン', cat: 'food', price: 6, cost: 0, level: 1, icon: 'bread'},
  {key: 'apple', name: 'りんご', cat: 'food', price: 4, cost: 0, level: 1, icon: 'apple', pal: {R: '#d8312b', D: '#8f1d18', W: '#ffb0a0'}},
  {key: 'wood_sword', name: '木の けん', cat: 'weapon', price: 10, cost: 0, level: 1, icon: 'sword', pal: BLADE.wood},
  {key: 'stone_sword', name: '石の けん', cat: 'weapon', price: 16, cost: 40, level: 1, icon: 'sword', pal: BLADE.stone},
  {key: 'cookie', name: 'クッキー', cat: 'food', price: 8, cost: 50, level: 1, icon: 'cookie'},
  {key: 'rod', name: 'つりざお', cat: 'tool', price: 14, cost: 60, level: 1, icon: 'rod'},
  {key: 'shield', name: '木の たて', cat: 'armor', price: 18, cost: 80, level: 1, icon: 'shield'},
  {key: 'fish', name: 'やき魚', cat: 'food', price: 12, cost: 100, level: 1, icon: 'fish'},
  {key: 'pickaxe', name: 'つるはし', cat: 'tool', price: 20, cost: 120, level: 1, icon: 'pickaxe', pal: {M: '#d6d6d6', D: '#8a8a8a'}},
  {key: 'bow', name: '弓', cat: 'weapon', price: 24, cost: 150, level: 2, icon: 'bow'},
  {key: 'steak', name: 'ステーキ', cat: 'food', price: 20, cost: 180, level: 2, icon: 'steak'},
  {key: 'iron_sword', name: '鉄の けん', cat: 'weapon', price: 35, cost: 250, level: 2, icon: 'sword', pal: BLADE.iron},
  {key: 'red_potion', name: '赤い 薬', cat: 'magic', price: 30, cost: 300, level: 2, icon: 'potion', pal: {C: '#e8344a', D: '#9c1a2c'}},
  {key: 'cake', name: 'ケーキ', cat: 'food', price: 30, cost: 350, level: 2, icon: 'cake'},
  {key: 'iron_helmet', name: '鉄の かぶと', cat: 'armor', price: 40, cost: 400, level: 2, icon: 'helmet', pal: {M: '#cfcfcf', L: '#ffffff', D: '#8a8a8a'}},
  {key: 'iron_armor', name: '鉄の よろい', cat: 'armor', price: 60, cost: 600, level: 3, icon: 'chest', pal: {M: '#cfcfcf', L: '#ffffff', D: '#8a8a8a'}},
  {key: 'gold_sword', name: '金の けん', cat: 'weapon', price: 55, cost: 700, level: 3, icon: 'sword', pal: BLADE.gold},
  {key: 'blue_potion', name: '青い 薬', cat: 'magic', price: 45, cost: 600, level: 3, icon: 'potion', pal: {C: '#3a7cf0', D: '#1c3f9c'}},
  {key: 'magic_book', name: 'まほうの 本', cat: 'magic', price: 70, cost: 900, level: 3, icon: 'book'},
  {key: 'golden_apple', name: '金の りんご', cat: 'food', price: 90, cost: 1200, level: 4, icon: 'apple', pal: {R: '#f5c932', D: '#b08410', W: '#fff7c0'}},
  {key: 'diamond_sword', name: 'ダイヤの けん', cat: 'weapon', price: 140, cost: 1800, level: 4, icon: 'sword', pal: BLADE.diamond},
  {key: 'diamond_armor', name: 'ダイヤの よろい', cat: 'armor', price: 200, cost: 2500, level: 5, icon: 'chest', pal: {M: '#4ee6dc', L: '#d0fffa', D: '#1aa89f'}},
];
export const ITEM = Object.fromEntries(ITEMS.map(i => [i.key, i]));
export const START_ITEMS = ITEMS.filter(i => i.cost === 0).map(i => i.key);

// ---- 町の レベル（売上の 合計） ----
export const LEVELS = [0, 200, 800, 2500, 6000, 15000];
export const MAX_LEVEL = LEVELS.length;

// ---- お客さん ----
export const CUSTOMER_TYPES = {
  villager: {
    name: 'むらびと', level: 1, weight: 3, buys: [1, 2],
    likes: ['bread', 'apple', 'fish', 'steak', 'cake', 'pickaxe', 'rod', 'cookie'],
    look: {skin: '#e8b48a', shirt: '#7a5a3a', pants: '#5a4028', hat: 'none', hair: '#4a3020', robe: true},
  },
  adventurer: {
    name: 'ぼうけんしゃ', level: 1, weight: 3, buys: [1, 2],
    likes: ['wood_sword', 'stone_sword', 'bow', 'iron_sword', 'shield', 'pickaxe', 'bread', 'steak', 'red_potion', 'iron_helmet'],
    look: {skin: '#f0c49a', shirt: '#3f8a3a', pants: '#6b4a2b', hat: 'cap', hatColor: '#2f6a2c', hair: '#c27a30', pack: true},
  },
  child: {
    name: '子ども', level: 1, weight: 2, buys: [1, 1],
    likes: ['apple', 'cookie', 'cake', 'wood_sword', 'rod', 'bread'],
    look: {skin: '#f6cfa8', shirt: '#f0b020', pants: '#3a64c0', hat: 'none', hair: '#2a1a10', scale: 0.72},
  },
  knight: {
    name: 'きし', level: 2, weight: 2, buys: [1, 2],
    likes: ['iron_sword', 'gold_sword', 'diamond_sword', 'shield', 'iron_helmet', 'iron_armor', 'diamond_armor', 'steak'],
    look: {skin: '#e8b48a', shirt: '#c8ccd4', pants: '#8a8f99', hat: 'helmet', hatColor: '#d8dce4', plume: '#d03030'},
  },
  wizard: {
    name: 'まほうつかい', level: 3, weight: 2, buys: [1, 2],
    likes: ['red_potion', 'blue_potion', 'magic_book', 'golden_apple', 'cake'],
    look: {skin: '#ecc8a8', shirt: '#5a3a9a', pants: '#5a3a9a', hat: 'wizard', hatColor: '#43287a', robe: true, beard: '#eeeeee'},
  },
  royal: {
    name: '王様の 使い', level: 4, weight: 1, buys: [2, 3],
    likes: ['golden_apple', 'diamond_sword', 'diamond_armor', 'gold_sword', 'cake', 'magic_book', 'iron_armor'],
    look: {skin: '#f0c49a', shirt: '#b8252a', pants: '#f2e6c8', hat: 'crown', hatColor: '#f5d442', hair: '#e8e0d0', cape: '#f5d442'},
  },
};

// じょうれんさん（名前のある お客さん）。5回 買い物を すると プレゼントを くれる。
export const GIFT_VISITS = 5;
export const REGULARS = [
  {key: 'tom', name: 'トム', type: 'villager', gift: 'EMERALD'},
  {key: 'hana', name: 'ハナ', type: 'villager', gift: 'BANNER_RED', look: {shirt: '#c05a7a', hair: '#8a4a20'}},
  {key: 'gald', name: 'ガルド', type: 'adventurer', gift: 'ARMOR_STAND', look: {shirt: '#8a3a2a', hair: '#3a2a1a', beard: '#3a2a1a'}},
  {key: 'riku', name: 'リク', type: 'adventurer', gift: 'BANNER_BLUE', look: {shirt: '#2a5aa0', hatColor: '#1a3a70'}},
  {key: 'mimi', name: 'ミミ', type: 'child', gift: 'GOLD', look: {shirt: '#ee8fb0', hair: '#c27a30'}},
  {key: 'sora', name: 'ソラ', type: 'child', gift: 'STAR', look: {shirt: '#55c2dc'}},
  {key: 'leon', name: 'レオン', type: 'knight', gift: 'TROPHY', look: {plume: '#3050d0'}},
  {key: 'sieg', name: 'ジーク', type: 'knight', gift: 'DIAMOND', look: {shirt: '#6a6f7a', hatColor: '#50555f', plume: '#f0c829'}},
  {key: 'merlin', name: 'マーリン', type: 'wizard', gift: 'CRYSTAL'},
  {key: 'sebas', name: 'セバス', type: 'royal', gift: 'THRONE'},
];
export const REGULAR = Object.fromEntries(REGULARS.map(r => [r.key, r]));

// ---- 店の ひょうか ----
export const CRITERIA = [
  {key: 'goods', name: '品ぞろえ', weight: 0.25, praise: '品ぞろえが すごい！', hint: '品物の しゅるいを ふやそう', ask: 'もっと いろいろ ほしいな'},
  {key: 'light', name: '明るさ', weight: 0.15, praise: '明るくて いい 店だね', hint: 'ランプで 明るく しよう', ask: 'ちょっと くらいね'},
  {key: 'deco', name: 'かざり', weight: 0.2, praise: 'かざりが すてき！', hint: '花や かざりを おこう', ask: 'かざりが ある と いいな'},
  {key: 'roof', name: '屋根', weight: 0.15, praise: 'りっぱな たてものだ！', hint: '屋根を つけよう', ask: '屋根が ほしいな'},
  {key: 'space', name: '広さ', weight: 0.1, praise: '広くて 見やすい！', hint: '店を 広く しよう', ask: 'ちょっと せまいね'},
  {key: 'sign', name: 'かんばん', weight: 0.15, praise: 'かんばんが かっこいい！', hint: 'かんばんを 立てよう', ask: 'なんて 店 かな？'},
];

// ---- やること（チュートリアルを かねた 目ひょう） ----
export const GOALS = [
  {key: 'firstSale', text: 'お客さんに 売ろう', reward: 20},
  {key: 'restock', text: 'たなを タップして 品物を ならべよう', reward: 20},
  {key: 'unlock', text: '仕入れで 新しい 品物を 買おう', reward: 30},
  {key: 'register', text: 'じぶんの 店に レジを おこう', reward: 30},
  {key: 'sign', text: 'かんばんに 店の 名前を 書こう', reward: 30},
  {key: 'stars3', text: '★3の 店に しよう', reward: 100},
  {key: 'level2', text: '町を レベル2に しよう', reward: 100},
  {key: 'gift', text: 'じょうれんさんから プレゼントを もらおう', reward: 150},
  {key: 'stars5', text: '★5の 店に しよう', reward: 300},
  {key: 'level4', text: '町を レベル4に しよう', reward: 500},
  {key: 'level6', text: '町を レベル6に しよう', reward: 1000},
];

// お客さんの セリフ
export const TALK = {
  want: ['ほしいな', 'ある かな？', 'さがしてる'],
  take: ['これ ください！', 'これに しよう', 'いいね！'],
  exact: 'これが ほしかった！',
  substitute: 'これでも いいか',
  missing: 'ない みたい…',
  soldOut: 'うりきれだ…',
  blocked: '入れない…',
  noRegister: 'レジが ない…',
  regular: 'また 来たよ！',
  thanks: ['ありがとう！', 'また 来るね！', 'いい 買い物！'],
  gift: 'いつも ありがとう！ プレゼント！',
  carry: 'これを 買うよ',
  hello: ['こんにちは！', 'いい 町だね', 'きょうは なにを 買おうかな', 'この 店 すき！'],
  wow: ['わぁ！ すごい 店！', 'りっぱな 店だなぁ', 'ワクワク する！'],
};
