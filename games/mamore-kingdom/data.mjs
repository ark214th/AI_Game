// まもれ！キングダム：タワー・てき・ヒーロー・ステージ・おみせの データ
export const FIELD = { w: 960, h: 540 };
export const PATH_W = 22;      // 道の はばの 半分
export const TOWER_R = 20;

// lv: レベル1〜3、a / b: 進化の 2つの 道（レベル4・5）
export const TOWERS = {
  archer: {
    name: '弓の やぐら', icon: '🏹', cost: 60, air: true, color: '#c98a3c',
    desc: 'はやく たくさん うつ。空の てきにも 当たる。',
    lv: [
      { dmg: 8, rate: 0.6, range: 150 },
      { dmg: 12, rate: 0.55, range: 160 },
      { dmg: 18, rate: 0.5, range: 170 },
    ],
    a: { name: 'れんしゃ名人', desc: 'ものすごい はやさで うちまくる',
      lv: [{ dmg: 20, rate: 0.25, range: 170 }, { dmg: 30, rate: 0.16, range: 180 }] },
    b: { name: 'ねらいうち名人', desc: '遠くから よろいごと うちぬく',
      lv: [{ dmg: 95, rate: 1.1, range: 280, pierce: true }, { dmg: 240, rate: 1.0, range: 340, pierce: true }] },
  },
  cannon: {
    name: 'たいほう', icon: '💣', cost: 110, air: false, color: '#5b6470',
    desc: 'ばくはつで まとめて たおす。空には 当たらない。',
    lv: [
      { dmg: 22, rate: 1.6, range: 130, splash: 42 },
      { dmg: 34, rate: 1.5, range: 140, splash: 46 },
      { dmg: 50, rate: 1.4, range: 150, splash: 50 },
    ],
    a: { name: '大ばくはつ', desc: 'ばくはつが とても 大きくなる',
      lv: [{ dmg: 90, rate: 1.4, range: 155, splash: 78 }, { dmg: 160, rate: 1.3, range: 165, splash: 98 }] },
    b: { name: 'ほのおの玉', desc: '当たった てきが もえつづける',
      lv: [{ dmg: 60, rate: 1.3, range: 155, splash: 52, burn: 22, burnT: 3 }, { dmg: 95, rate: 1.1, range: 165, splash: 56, burn: 55, burnT: 4 }] },
  },
  ice: {
    name: '氷の とう', icon: '❄️', cost: 90, air: true, color: '#6cc7f2', unlock: 150,
    desc: 'まわりの てきを のろくする。',
    lv: [
      { dmg: 3, rate: 1.2, range: 100, slow: 0.35, slowT: 1.6 },
      { dmg: 5, rate: 1.1, range: 110, slow: 0.42, slowT: 1.7 },
      { dmg: 8, rate: 1.0, range: 120, slow: 0.5, slowT: 1.8 },
    ],
    a: { name: 'カチコチ', desc: 'てきを こおらせて 止める',
      lv: [{ dmg: 14, rate: 2.4, range: 125, slow: 0.5, slowT: 2.4, stun: 0.9 }, { dmg: 30, rate: 2.2, range: 140, slow: 0.55, slowT: 2.4, stun: 1.5 }] },
    b: { name: 'ふぶき', desc: '広く ふいて、てきが きずつきやすくなる',
      lv: [{ dmg: 10, rate: 1.0, range: 165, slow: 0.5, slowT: 2, vuln: 1.25 }, { dmg: 22, rate: 0.9, range: 195, slow: 0.6, slowT: 2, vuln: 1.45 }] },
  },
  mage: {
    name: 'まほうの とう', icon: '🔮', cost: 150, air: true, color: '#9a6be0', unlock: 350,
    desc: 'よろいを つきぬける 強い まほう。',
    lv: [
      { dmg: 30, rate: 1.3, range: 140, pierce: true },
      { dmg: 46, rate: 1.2, range: 150, pierce: true },
      { dmg: 68, rate: 1.1, range: 160, pierce: true },
    ],
    a: { name: 'いなずま', desc: 'かみなりが つぎつぎ とびうつる',
      lv: [{ dmg: 70, rate: 1.0, range: 165, pierce: true, chain: 3 }, { dmg: 115, rate: 0.8, range: 175, pierce: true, chain: 6 }] },
    b: { name: '大まほう', desc: 'ボスにも きく ものすごい 一げき',
      lv: [{ dmg: 270, rate: 1.5, range: 185, pierce: true }, { dmg: 620, rate: 1.4, range: 205, pierce: true, splash: 36 }] },
  },
  barracks: {
    name: 'へいしの 小屋', icon: '🛡️', cost: 120, air: false, color: '#b5533c', unlock: 600,
    desc: 'へいしが 道に 立って てきを 止める。',
    lv: [
      { n: 2, hp: 70, dmg: 7, rate: 0.8, range: 110 },
      { n: 2, hp: 110, dmg: 11, rate: 0.8, range: 115 },
      { n: 3, hp: 160, dmg: 16, rate: 0.8, range: 120 },
    ],
    a: { name: 'きしだん', desc: 'とても かたい きしが 3人',
      lv: [{ n: 3, hp: 380, dmg: 30, rate: 0.75, range: 125 }, { n: 3, hp: 760, dmg: 60, rate: 0.7, range: 130 }] },
    b: { name: '大ぜいの へいし', desc: 'へいしが どっと ふえる',
      lv: [{ n: 5, hp: 170, dmg: 24, rate: 0.7, range: 125 }, { n: 6, hp: 270, dmg: 40, rate: 0.65, range: 130 }] },
  },
  dragon: {
    name: 'ドラゴンの す', icon: '🐉', cost: 450, air: true, color: '#e0563a', unlock: 1500,
    desc: 'ほのおで 道ごと やきはらう。',
    lv: [
      { dmg: 14, rate: 0.25, range: 150, beam: 34 },
      { dmg: 20, rate: 0.25, range: 160, beam: 38 },
      { dmg: 28, rate: 0.25, range: 170, beam: 42 },
    ],
    a: { name: '大ほのお', desc: 'ふとい ほのおで もやしつくす',
      lv: [{ dmg: 44, rate: 0.25, range: 180, beam: 54, burn: 30, burnT: 2 }, { dmg: 74, rate: 0.25, range: 195, beam: 64, burn: 70, burnT: 3 }] },
    b: { name: 'いなずまドラゴン', desc: '遠くまで かみなりを はなつ',
      lv: [{ dmg: 150, rate: 0.6, range: 230, pierce: true, chain: 4 }, { dmg: 270, rate: 0.5, range: 270, pierce: true, chain: 8 }] },
  },
};
export const TOWER_IDS = Object.keys(TOWERS);
export const UP_MUL = [0.6, 1.0, 2.2, 3.6];   // レベル2・3・4・5に する ねだん（もとの ねだんの 何倍か）
export const SELL_RATE = 0.7;

export const ENEMIES = {
  goblin: { name: 'ゴブリン', hp: 28, spd: 52, atk: 5, gold: 4, leak: 1, r: 10, cost: 1 },
  wolf: { name: 'オオカミ', hp: 20, spd: 100, atk: 5, gold: 4, leak: 1, r: 10, cost: 1.1 },
  bat: { name: 'コウモリ', hp: 30, spd: 75, atk: 0, gold: 6, leak: 1, r: 9, fly: true, cost: 1.6 },
  slime: { name: 'スライム', hp: 70, spd: 42, atk: 6, gold: 6, leak: 1, r: 13, split: 'mini', cost: 2.4 },
  mini: { name: 'ちびスライム', hp: 22, spd: 62, atk: 3, gold: 2, leak: 1, r: 8, cost: 0.6 },
  knight: { name: 'よろいきし', hp: 110, spd: 36, atk: 12, gold: 12, leak: 2, r: 12, armor: 7, cost: 4 },
  shaman: { name: 'まどうし', hp: 80, spd: 44, atk: 4, gold: 14, leak: 2, r: 11, heal: 10, healR: 75, cost: 4 },
  ogre: { name: 'オーガ', hp: 520, spd: 27, atk: 30, gold: 40, leak: 5, r: 18, cost: 14 },
  ogreking: { name: 'オーガ王', hp: 2600, spd: 22, atk: 70, gold: 200, leak: 10, r: 27, armor: 4, boss: true, cost: 60 },
  icegiant: { name: '氷の きょ人', hp: 4200, spd: 20, atk: 110, gold: 350, leak: 12, r: 30, armor: 10, boss: true, cost: 110,
    aura: { every: 8, r: 150, dur: 3, kind: 'ice' } },
  firedragon: { name: 'ほのおの ドラゴン', hp: 6500, spd: 24, atk: 0, gold: 600, leak: 15, r: 32, armor: 6, fly: true, boss: true, cost: 180,
    aura: { every: 7, r: 170, dur: 2.5, kind: 'fire' } },
};
// どの 波から 出てくるか（ステージが 進むと 早く 出る）
export const UNLOCK = [
  { type: 'goblin', from: 0 }, { type: 'wolf', from: 1 }, { type: 'bat', from: 3 }, { type: 'slime', from: 4 },
  { type: 'knight', from: 6 }, { type: 'shaman', from: 8 }, { type: 'ogre', from: 9 },
];
const GAP = { goblin: 0.7, wolf: 0.5, bat: 0.8, slime: 1.0, knight: 1.4, shaman: 2.2, ogre: 3.2 };

export const HEROES = {
  squire: { name: 'みならい きし ポコ', short: 'ポコ', icon: '🗡️', cost: 0, color: '#58a85c',
    hp: 180, dmg: 12, rate: 0.8, range: 30, spd: 90, block: 2,
    skill: { id: 'cheer', name: 'おうえん', cd: 30, desc: 'タワーぜんぶが 6びょう はやく うつ' },
    desc: 'はじめの なかま。道に 立って てきを 止める。' },
  knight: { name: 'きしだんちょう レオ', short: 'レオ', icon: '⚔️', cost: 600, color: '#e2b23a',
    hp: 520, dmg: 32, rate: 0.7, range: 34, spd: 85, block: 4, cleave: 32,
    skill: { id: 'spin', name: '大かいてんぎり', cd: 22, dmg: 220, r: 115, stun: 2.5, desc: 'まわりの てきを ふきとばして 止める' },
    desc: 'とても かたい。4ひきまで まとめて 止める。' },
  mage: { name: '大まどうし ルーナ', short: 'ルーナ', icon: '🌙', cost: 1500, color: '#8f6be8',
    hp: 220, dmg: 58, rate: 0.9, range: 185, spd: 80, block: 0, splash: 40, pierce: true, air: true,
    skill: { id: 'meteor', name: 'ながれ星', cd: 20, dmg: 480, r: 105, burn: 40, burnT: 3, aim: true, desc: 'すきな 場所に 星を おとす' },
    desc: '遠くから まほうで こうげき。空の てきにも 強い。' },
  rider: { name: 'ドラゴンきし カイ', short: 'カイ', icon: '🐲', cost: 3000, color: '#e2573b',
    hp: 400, dmg: 34, rate: 0.25, range: 140, spd: 230, block: 0, splash: 46, air: true, fly: true,
    skill: { id: 'breath', name: 'ごうかの ブレス', cd: 28, dmg: 320, burn: 45, burnT: 4, desc: 'がめんの てき ぜんぶを もやす' },
    desc: '空を とんで どこへでも すぐ かけつける。' },
};
export const HERO_IDS = Object.keys(HEROES);
export const HERO_LV_COST = [0, 250, 600];   // ヒーローの レベル2・3
export const HERO_LV_MAX = 3;

export const DIFFS = [
  { id: 'normal', name: 'ふつう', hp: 1, gem: 1 },
  { id: 'hard', name: 'むずかしい', hp: 1.7, gem: 1.7 },
  { id: 'expert', name: 'げきむず', hp: 2.8, gem: 2.8 },
];

export const STAGES = [
  { id: 'meadow', name: 'みどりの 草原', icon: '🌿', waves: 10, hp: 1, gemWave: 6, gemWin: 40, boss: 'ogreking', mid: [],
    castle: [100, 452],
    paths: [[[1000, 120], [720, 120], [720, 330], [470, 330], [470, 140], [220, 140], [220, 400], [150, 448]]] },
  { id: 'snow', name: 'こごえる 雪山', icon: '⛄', waves: 12, hp: 1.4, gemWave: 11, gemWin: 90, boss: 'icegiant', mid: [5],
    castle: [100, 452],
    paths: [
      [[1000, 150], [760, 150], [760, 380], [540, 380], [540, 220], [300, 220], [300, 420], [155, 448]],
      [[620, -40], [620, 90], [300, 90], [300, 220], [300, 420], [155, 448]],
    ] },
  { id: 'volcano', name: 'もえる 火山', icon: '🌋', waves: 15, hp: 2.3, gemWave: 17, gemWin: 170, boss: 'firedragon', mid: [5, 10],
    castle: [100, 452],
    paths: [
      [[1000, 110], [820, 110], [820, 300], [640, 300], [640, 130], [460, 130], [460, 330], [250, 330], [250, 430], [158, 448]],
      [[1000, 462], [360, 462], [360, 330], [250, 330], [250, 430], [158, 448]],
    ] },
];
const BOSS_ORDER = ['ogreking', 'icegiant', 'firedragon'];

// ずっと のこる 買いもの（タワーの 強化・おしろ）
export const POW_COST = [30, 60, 110, 180, 280];
export const POW_STEP = 0.12;
export const CASTLE_UPS = {
  gold: { name: 'たからばこ', icon: '💰', desc: 'はじめの ゴールドが ふえる', cost: [40, 80, 140, 220, 320], step: 40 },
  life: { name: 'じょうぶな かべ', icon: '❤️', desc: 'おしろの ライフが ふえる', cost: [40, 80, 140, 220, 320], step: 4 },
  guard: { name: 'おしろの 弓たい', icon: '🏰', desc: 'おしろからも 矢が とぶ', cost: [120, 320, 700], step: 1 },
};
export const GUARD = [null, { dmg: 10, rate: 0.7, range: 170 }, { dmg: 22, rate: 0.55, range: 190 }, { dmg: 46, rate: 0.4, range: 210 }];
export const BASE_GOLD = 170, BASE_LIVES = 20;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1つの 波に 出てくる てきの ならび。[{type, count, gap, delay, path}]
export function waveSpec(si, w, endless = false) {
  const st = STAGES[si], r = rng(si * 1000 + w * 7 + 13), np = st.paths.length;
  const eff = w + si * 2;
  const last = !endless && w === st.waves - 1;
  const boss = last ? st.boss
    : endless && w % 5 === 4 ? BOSS_ORDER[Math.min(BOSS_ORDER.length - 1, (si + Math.floor(w / 10)) % 3)]
      : st.mid.includes(w) ? BOSS_ORDER[Math.max(0, si - 1)] : null;
  let budget = 7 + 3.6 * eff + 0.34 * eff * eff;
  if (boss) budget *= 0.6;
  const pool = UNLOCK.filter(u => u.from <= eff).map(u => u.type);
  const picks = [];
  const fresh = UNLOCK.find(u => u.from === eff);
  if (fresh) picks.push(fresh.type);
  const want = w === 0 ? 1 : w < 4 ? 2 : 3;
  let guard = 0;
  while (picks.length < Math.min(want, pool.length) && guard++ < 50) {
    // 新しい てきほど えらばれやすい
    const t = pool[Math.min(pool.length - 1, Math.floor(Math.pow(r(), 0.7) * pool.length))];
    if (!picks.includes(t)) picks.push(t);
  }
  const groups = [];
  let delay = 0;
  picks.forEach((type, i) => {
    const share = budget / picks.length;
    const count = Math.max(1, Math.round(share / ENEMIES[type].cost));
    const gap = GAP[type] * (1 - Math.min(0.45, eff * 0.015));
    groups.push({ type, count, gap, delay, path: (i + w) % np });
    delay += count * gap * 0.55 + 1;
  });
  if (boss) groups.push({ type: boss, count: 1, gap: 1, delay: Math.max(2, delay * 0.5), path: w % np });
  return groups;
}
export const hpScale = (w, endless) => Math.pow(1.1, w) * (endless && w > 14 ? Math.pow(1.05, w - 14) : 1);
