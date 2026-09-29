// 階段法（n-down 1-up）。level が大きいほど難しい。状態はプレーンなオブジェクトで、セーブにそのまま入る。

import { STAIRCASE } from '../../config/tuning.mjs';

export function createStaircase({ level = 0, min = 0, max = 40, down = STAIRCASE.down, up = STAIRCASE.up } = {}) {
  return { level, min, max, down, up, streak: 0, lastDir: 0, reversals: 0, trials: 0 };
}

export function updateStaircase(s, correct) {
  const n = { ...s, trials: s.trials + 1 };
  let dir = 0;
  if (correct) {
    n.streak = s.streak + 1;
    if (n.streak >= s.down) {
      n.streak = 0;
      if (s.level < s.max) { n.level = s.level + 1; dir = 1; }
    }
  } else {
    n.streak = 0;
    const lv = Math.max(s.min, s.level - s.up);
    if (lv !== s.level) { n.level = lv; dir = -1; }
  }
  if (dir !== 0) {
    if (s.lastDir !== 0 && dir !== s.lastDir) n.reversals = s.reversals + 1;
    n.lastDir = dir;
  }
  return n;
}

// 上限を変える（端末のリフレッシュレートで「1フレーム」になる段階が変わるため）
export function withMax(s, max) {
  return { ...s, max, level: Math.min(s.level, max) };
}

export function ease(s, steps) {
  return { ...s, level: Math.max(s.min, s.level - steps), streak: 0 };
}
