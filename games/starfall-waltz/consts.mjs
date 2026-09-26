// 画面・判定・難易度など、シミュレーションと描画の両方が使う定数
export const W = 384, H = 448, TAU = Math.PI * 2;
export const PLAYER_R = 2.2;          // 自機の当たり判定（見た目より遥かに小さい）
export const GRAZE_R = 18;            // かすり判定
export const POC_Y = 112;             // この線より上でアイテム自動回収
export const DEATHBOMB_FRAMES = 10;   // 被弾後にボムを受け付けるフレーム数（約1/6秒）
export const SPEED_FAST = 4.2, SPEED_SLOW = 1.8;
export const BOMB_FRAMES = 150, BOMB_INVULN = 220, RESPAWN_INVULN = 240;
export const EXTENDS = [60, 150, 260, 400, 600, 850, 1150];
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
  star: {size: 6.5, r: 3.0, spin: .07},
  ring: {size: 6.5, r: 3.2},
  gear: {size: 7, r: 3.4, spin: .05},
  big: {size: 14, r: 9},
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
