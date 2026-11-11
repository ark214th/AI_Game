// 画面・判定・難易度など、シミュレーションと描画の両方が使う定数
export const W = 384, H = 448, TAU = Math.PI * 2;
export const PLAYER_R = 2.2;          // 自機の当たり判定（見た目より遥かに小さい）
export const GRAZE_R = 18;            // かすり判定
export const POC_Y = 112;             // この線より上でアイテム自動回収
export const DEATHBOMB_FRAMES = 10;   // 被弾後にボムを受け付けるフレーム数（約1/6秒）
export const BOMB_FRAMES = 150, BOMB_INVULN = 220, RESPAWN_INVULN = 240;
export const STOP_FRAMES = 170;       // クレメンタインのボム「大休止」で時が止まる長さ
export const FORT_FRAMES = 540;       // フォルティッシモ（共鳴ゲージ満タン）の長さ
export const RESO_GRAZE = .0125, RESO_CAPTURE = .25, RESO_POINT = .004;
export const EXTENDS = [60, 150, 260, 400, 600, 850, 1150, 1500];
export const MAX_LIVES = 8, MAX_POWER = 4;

// tier: 弾幕パターンの段階（dv の選択肢）。LARGO は ANDANTE の弾幕をさらに遅く、薄くしたもの
export const DIFFICULTIES = [
  {id: 'largo', name: 'LARGO', ja: 'はじめて', note: 'ゆったりと', tier: 0, lives: 4, bombs: 4, deathbomb: 24,
    bulletSpeed: .75, density: .6, bossHp: .65, continues: Infinity},
  {id: 'andante', name: 'ANDANTE', ja: 'やさしい', note: '歩くような速さで', tier: 0, lives: 3},
  {id: 'allegro', name: 'ALLEGRO', ja: 'ふつう', note: '快活に、速く', tier: 1, lives: 2},
  {id: 'presto', name: 'PRESTO', ja: 'むずかしい', note: 'きわめて急速に', tier: 2, lives: 2},
];
export const DEFAULT_LEVEL = 2;

// 自機。fast/slow: 移動速度、bomb: ボムの種類
export const CHARACTERS = [
  {id: 'nova', name: 'NOVA', ja: 'ノヴァ', title: '星降りの子', color: '#ffd98a', fast: 4.2, slow: 1.8, bomb: 'nova',
    shot: '追尾する星 ／ 集中の針', bombName: 'SUPERNOVA', bombJa: '弾を星に変える光の輪。長い無敵',
    note: '敵を追う星で、避けることに集中できる。はじめての人に。'},
  {id: 'clem', name: 'CLEMENTINE', ja: 'クレメンタイン', title: '時計仕掛けの踊り子', color: '#ffb45a', fast: 3.8, slow: 1.6, bomb: 'stop',
    shot: '広がる歯車 ／ 貫く長針', bombName: 'GRAND PAUSE', bombJa: '時を止める。止まった弾はすべて星に',
    note: '正面に強い。時を止めている間、ボスを撃ち放題。'},
];

export const COLORS = {
  red: '#ff4a6e', orange: '#ff8c3a', yellow: '#ffe25a', gold: '#ffc35a', green: '#5ef08f',
  cyan: '#48e0ff', blue: '#5b86ff', violet: '#b36bff', pink: '#ff79d8', white: '#dfe8ff',
};
export const RAINBOW = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'violet'];

// size: 見た目の半径, r: 当たり判定の半径, orient: 進行方向に回転, spin: 自転
export const BULLET_TYPES = {
  pellet: {size: 3.2, r: 1.7},
  orb: {size: 5, r: 2.6},
  rice: {size: 5, r: 2.2, orient: true},
  shard: {size: 5.5, r: 2.2, orient: true},
  petal: {size: 5.5, r: 2.2, orient: true},
  drop: {size: 5.5, r: 2.3, orient: true},
  quill: {size: 7, r: 2.2, orient: true},
  star: {size: 6.5, r: 3.0, spin: .07},
  crescent: {size: 7, r: 2.9, spin: .06},
  note: {size: 7, r: 2.7},
  ring: {size: 6.5, r: 3.2},
  bubble: {size: 12, r: 6.5},
  comet: {size: 9, r: 4.4, orient: true},
  big: {size: 14, r: 9},
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
