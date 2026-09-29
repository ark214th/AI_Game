// 調整用の数値はすべてここに集める（DESIGN.md 冒頭「数値はすべて初期値」）。
// プロフィール（おとな・こども）は同じコードで切り替えられるよう、データとして持つ。

export const PROFILES = {
  adult: {
    id: 'adult',
    label: 'おとな',
    flash: {
      durationStartMs: 500,     // 閃光の初期表示時間
      durationRatio: 0.8,       // 1段階ごとに表示時間を何倍にするか（対数スケール）
      fixationMs: [500, 1000],  // 注視点の表示時間（毎回ランダム。いつ光るか読ませない）
      maskMs: 260,              // 閃光直後のマスク（残像で答えさせない）
      emblemCount: 4,           // 中央の紋章の種類数
      eccLevels: [0.40, 0.52, 0.64, 0.76, 0.88], // 周辺対象の距離（視野の半径に対する比）。近い→遠い
      distractorLevels: [1, 2, 3, 4, 5, 6],      // 段階3の妨害物の数
      fakeFromLevel: 2,         // 妨害物の段階がこれ以上になると「偽の宝箱」が混ざる
      reflectionFromStage: 2,   // 地底湖（反射した偽像）が出始める段階
      stagePromoteEase: 2,      // 段階が上がったとき、表示時間を何段階やさしく戻すか
    },
    dive: {
      rooms: 20,        // 1回の潜行の部屋数
      oilMax: 6,        // ランタン油
      comboRefill: 5,   // この回数連続で成功するたびに油が1戻る
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
    dive: {
      rooms: 16,
      oilMax: 8,
      comboRefill: 4,
    },
  },
};

// 階段法：3回連続正解で1段階難しく、1回不正解で1段階やさしく（成功率 約79% に収束）
export const STAIRCASE = { down: 3, up: 1 };

// 閃光の段階（1：紋章のみ → 2：紋章＋周辺の位置 → 3：＋妨害物）の上げ下げ
export const STAGE_RULE = {
  minTrials: 10,   // その段階で最低この回数やってから判定する
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

export const FEEDBACK_MS = { success: 1150, fail: 1350 };

export const SAVE_KEY = 'mnemo-manor-v1';
export const LOG_LIMIT = 600;
