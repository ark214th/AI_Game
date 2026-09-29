// 調整用の数値はすべてここに集める（DESIGN.md 冒頭「数値はすべて初期値」）。
// プロフィール（おとな・こども）は同じコードで切り替えられるよう、データとして持つ。

export const PROFILES = {
  adult: {
    id: 'adult',
    label: 'おとな',
    flash: {
      durationStartMs: 500,     // 閃光の初期表示時間
      durationRatio: 0.8,       // 1段階ごとに表示時間を何倍にするか（対数スケール）
      fixationMs: [450, 900],   // 注視点の表示時間（毎回ランダム。いつ光るか読ませない）
      maskMs: 260,              // 閃光直後のマスク（残像で答えさせない）
      emblemCount: 4,           // 中央の紋章の種類数
      eccLevels: [0.40, 0.52, 0.64, 0.76, 0.88], // 周辺対象の距離（視野の半径に対する比）。近い→遠い
      distractorLevels: [1, 2, 3, 4, 5, 6],      // 段階3の妨害物の数
      fakeFromLevel: 2,         // 妨害物の段階がこれ以上になると「偽の宝箱」が混ざる
      reflectionFromStage: 2,   // 地底湖（反射した偽像）が出始める段階
      stagePromoteEase: 2,      // 段階が上がったとき、表示時間を何段階やさしく戻すか
    },
    run: {
      oilBase: 4,              // ランタン油の最大量（館の手入れで増える）
      lampsBase: 1,            // 記憶の灯の数（館の手入れで増える）
      storeSecBase: 25,        // 収納の制限時間 = base + 品数 × perItem（null で時間制限なし）
      storeSecPerItem: 9,
      timeBonusRatio: 0.4,     // 残り時間がこの割合以上なら、ランタン油 +1
      flashBetween: [1, 2],    // 祭壇と祭壇のあいだの閃光の部屋の数
      altarMaxLevel: 3,        // 祭壇のダミーの紛らわしさの上限
      recommendStart: 5,       // おすすめの品数（はじめ）
    },
  },
  child: {
    id: 'child',
    label: 'こども',
    flash: {
      durationStartMs: 800,
      durationRatio: 0.8,
      fixationMs: [600, 1100],
      maskMs: 260,
      emblemCount: 4,
      eccLevels: [0.40, 0.52, 0.64, 0.76],
      distractorLevels: [1, 2, 3],
      fakeFromLevel: 99,        // 子ども向けは偽の宝箱を出さない
      reflectionFromStage: 99,
      stagePromoteEase: 2,
    },
    run: {
      oilBase: 6,
      lampsBase: 2,
      storeSecBase: null,
      storeSecPerItem: 0,
      timeBonusRatio: 0,
      flashBetween: [1, 1],
      altarMaxLevel: 1,
      recommendStart: 3,
    },
  },
};

// 階段法：3回連続正解で1段階難しく、1回不正解で1段階やさしく（成功率 約79% に収束）
export const STAIRCASE = { down: 3, up: 1 };

// 閃光の段階（1：紋章のみ → 2：紋章＋周辺の位置 → 3：＋妨害物）の上げ下げ
export const STAGE_RULE = {
  minTrials: 6,    // その段階で最低この回数やってから判定する
  window: 12,      // 直近何回の成功率で判定するか
  promoteAt: 0.83, // これ以上なら段階を上げる
  demoteAt: 0.5,   // これ以下なら段階を下げる（window 回そろってから）
};

// 1段階の中で、どの要素の階段を動かすかを順番に回す（要素ごとに独立した階段法）
export const FOCUS_PATTERN = {
  1: ['duration'],
  2: ['duration', 'ecc'],
  3: ['duration', 'ecc', 'duration', 'distract'],
};

export const TIMING = {
  measureFrames: 72,   // 起動時にリフレッシュレートを測るフレーム数
  dropFactor: 1.5,     // 1フレームの間隔がこの倍を超えたら「フレーム落ち」とみなす
};

export const FEEDBACK_MS = { success: 950, fail: 1250 };

// 報酬（金貨）
export const REWARD = {
  perItem: 6,            // 祭壇で正しく選べた品1つ
  lampPenalty: 0.5,      // 記憶の灯を使った品は、この割合になる
  flash: 2,              // 閃光で宝箱を見抜いた（段階1は扉の先の小さな宝）
  requestBonus: (n) => n * 6 + (n - 1) * 4, // 依頼を全部そろえたときのお礼
  multi: [1, 1, 1.15, 1.3], // 同時に受けた依頼の数による上乗せ（欲張るほど大きい）
};

export const BOARD = { count: 4, sizes: [2, 3, 4], bigFrom: 7 }; // おすすめが bigFrom 以上なら5品の依頼も出る

// 館の手入れ（メタ進行）。閃光の表示時間を延ばす強化は作らない（DESIGN.md 5.5）
export const SHOP = {
  room: [70, 110, 160, 220, 290],   // 新しい部屋（置き場 +4）。はじめは3部屋
  oil: [50, 90, 140],              // 油壺（ランタン油の最大 +1）
  lamp: [70, 130],                 // 記憶の灯 +1
  startRooms: 3,
};

export const SAVE_KEY = 'mnemo-manor-v1';
export const PEEK_MS = 2000; // 記憶の灯で館を覗ける時間
export const LOG_LIMIT = 600;
