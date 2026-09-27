// きせかえとシール帳：何をすると、何がもらえるか
// progress = { stages: { '1-1': { clear, medals: [b,b,b], noDamage } }, starsTotal, flags: { loop, ride, ... }, stomps }

const cleared = (p, id) => !!p.stages[id]?.clear;
export const medalCount = p => Object.values(p.stages).reduce((n, s) => n + (s.medals || []).filter(Boolean).length, 0);
const worldMedals = (p, w) => [1, 2, 3].every(i => (p.stages[`${w}-${i}`]?.medals || []).filter(Boolean).length === 3);

// ---------- きせかえ ----------
// slot: head（あたま）/ face（かお）/ color（いろ）
export const ITEMS = [
  { id: 'head-none', slot: 'head', name: 'なし', icon: '・', need: () => true, hint: '' },
  { id: 'ribbon', slot: 'head', name: 'リボン', icon: '🎀', need: () => true, hint: '' },
  { id: 'flower', slot: 'head', name: 'はなかんむり', icon: '🌼', need: p => cleared(p, '1-1'), hint: '1-1 を クリア' },
  { id: 'strawberry', slot: 'head', name: 'いちごぼうし', icon: '🍓', need: p => cleared(p, '2-3'), hint: 'ワールド2の ボス' },
  { id: 'cloud', slot: 'head', name: 'くもぼうし', icon: '☁️', need: p => cleared(p, '3-3'), hint: 'ワールド3の ボス' },
  { id: 'straw', slot: 'head', name: 'むぎわらぼうし', icon: '👒', need: p => cleared(p, '4-3'), hint: 'ワールド4の ボス' },
  { id: 'crown', slot: 'head', name: 'おうかん', icon: '👑', need: p => cleared(p, '5-3'), hint: 'さいごの ボス' },
  { id: 'starpin', slot: 'head', name: 'ほしのピン', icon: '⭐', need: p => medalCount(p) >= 9, hint: 'メダル 9こ' },
  { id: 'bunny', slot: 'head', name: 'うさみみ', icon: '🐰', need: p => medalCount(p) >= 24, hint: 'メダル 24こ' },
  { id: 'face-none', slot: 'face', name: 'なし', icon: '・', need: () => true, hint: '' },
  { id: 'glasses', slot: 'face', name: 'まるめがね', icon: '👓', need: p => medalCount(p) >= 3, hint: 'メダル 3こ' },
  { id: 'hearts', slot: 'face', name: 'ハートめがね', icon: '💗', need: p => medalCount(p) >= 15, hint: 'メダル 15こ' },
  { id: 'starcheek', slot: 'face', name: 'ほしのほっぺ', icon: '✨', need: p => p.starsTotal >= 500, hint: 'ほし 500こ' },
  { id: 'milk', slot: 'color', name: 'ミルク', icon: '🤍', color: 0xfff4f7, need: () => true, hint: '' },
  { id: 'pink', slot: 'color', name: 'さくら', icon: '🩷', color: 0xffc9dc, need: p => cleared(p, '1-3'), hint: 'ワールド1の ボス' },
  { id: 'mint', slot: 'color', name: 'ミント', icon: '💚', color: 0xc8f2dc, need: p => cleared(p, '2-3'), hint: 'ワールド2の ボス' },
  { id: 'sky', slot: 'color', name: 'そら', icon: '🩵', color: 0xc9e8ff, need: p => cleared(p, '3-3'), hint: 'ワールド3の ボス' },
  { id: 'lemon', slot: 'color', name: 'レモン', icon: '💛', color: 0xfff1a8, need: p => cleared(p, '4-3'), hint: 'ワールド4の ボス' },
  { id: 'lavender', slot: 'color', name: 'ラベンダー', icon: '💜', color: 0xe2d4ff, need: p => cleared(p, '5-3'), hint: 'さいごの ボス' },
  { id: 'rainbow', slot: 'color', name: 'にじいろ', icon: '🌈', color: 0xffffff, need: p => medalCount(p) >= 45, hint: 'メダル ぜんぶ' },
];
export const DEFAULT_OUTFIT = { head: 'head-none', face: 'face-none', color: 'milk' };

// ---------- シール帳 ----------
const STAGE_STICKERS = [
  ['1-1', '🌷'], ['1-2', '🐞'], ['1-3', '🟣'], ['2-1', '🍭'], ['2-2', '🍪'], ['2-3', '🍮'],
  ['3-1', '☁️'], ['3-2', '🌈'], ['3-3', '🌧️'], ['4-1', '🐚'], ['4-2', '🏝️'], ['4-3', '🦀'],
  ['5-1', '🏰'], ['5-2', '🌙'], ['5-3', '🌟'],
];
export const STICKERS = [
  ...STAGE_STICKERS.map(([id, icon]) => ({ id: 'clear-' + id, icon, name: `${id} クリア`, hint: `${id} を クリア`, need: p => cleared(p, id) })),
  ...[['🌻', 1], ['🧁', 2], ['🎈', 3], ['🐬', 4], ['🦄', 5]].map(([icon, w]) => ({ id: 'medals-' + w, icon, name: `ワールド${w} メダル ぜんぶ`, hint: `ワールド${w}の メダルを ぜんぶ`, need: p => worldMedals(p, w) })),
  ...[['⭐', 100], ['🌠', 300], ['💫', 600], ['🎇', 1000]].map(([icon, n]) => ({ id: 'stars-' + n, icon, name: `ほし ${n}こ`, hint: `ほしを ${n}こ あつめる`, need: p => p.starsTotal >= n })),
  { id: 'loop', icon: '🎡', name: 'はじめての ループ', hint: 'ループで くるっと まわる', need: p => !!p.flags.loop },
  { id: 'ride', icon: '🫧', name: 'しゃぼんだまに のった', hint: 'しゃぼんだまに のる', need: p => !!p.flags.ride },
  { id: 'switch', icon: '🗝️', name: 'ほしのスイッチ', hint: 'ほしのスイッチを おす', need: p => !!p.flags.switch },
  { id: 'boing', icon: '🍡', name: 'ぽよーん', hint: 'ぽよんぐもで はねる', need: p => !!p.flags.boing },
  { id: 'stomp', icon: '👟', name: 'ふみふみ 20かい', hint: 'いたずらっこを 20かい ふむ', need: p => p.stomps >= 20 },
  { id: 'nodamage', icon: '💖', name: 'いたくないで クリア', hint: 'いちども いたくならずに クリア', need: p => Object.values(p.stages).some(s => s.noDamage) },
];

export const unlockedItems = p => new Set(ITEMS.filter(i => i.need(p)).map(i => i.id));
export const unlockedStickers = p => new Set(STICKERS.filter(s => s.need(p)).map(s => s.id));

// 保存データを progress の形にそろえる（古い保存データでも動くように）
export function normalizeProgress(save) {
  return {
    stages: save.stages || {},
    starsTotal: Number.isFinite(save.starsTotal) ? save.starsTotal : 0,
    flags: save.flags && typeof save.flags === 'object' ? save.flags : {},
    stomps: Number.isFinite(save.stomps) ? save.stomps : 0,
  };
}
