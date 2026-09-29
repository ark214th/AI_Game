// 閃光フェーズのロジック（描画に依存しない）。
// 1回の閃光 = 注視点 → 閃光（中央の紋章＋周辺の宝箱）→ マスク → 回答。

import { createStaircase, updateStaircase, withMax, ease } from '../adaptive/staircase.mjs';
import { STAGE_RULE, FOCUS_PATTERN } from '../../config/tuning.mjs';

export const EMBLEMS = ['sun', 'moon', 'star', 'crown'];
export const EMBLEM_LABELS = { sun: '太陽', moon: '月', star: '星', crown: '王冠' };
export const DIR_COUNT = 8;
export const DIR_LABELS = ['上', '右上', '右', '右下', '下', '左下', '左', '左上'];
// 方向0が真上、時計回り
export const dirAngle = (i) => -Math.PI / 2 + (i * Math.PI) / 4;
export const MAX_STAGE = 3;

export function durationMs(level, fl) {
  return fl.durationStartMs * Math.pow(fl.durationRatio, level);
}

export function msToFrames(ms, frameMs) {
  return Math.max(1, Math.round(ms / frameMs));
}

// この端末で「1フレーム表示」になる最初の段階。これより先に難しくしても意味がない。
export function maxDurationLevel(fl, frameMs) {
  let l = 0;
  while (l < 80 && msToFrames(durationMs(l, fl), frameMs) > 1) l++;
  return l;
}

export function createFlashState(profile) {
  const fl = profile.flash;
  return {
    stage: 1,
    stairs: {
      duration: createStaircase({ max: 40 }),
      ecc: createStaircase({ max: fl.eccLevels.length - 1 }),
      distract: createStaircase({ max: fl.distractorLevels.length - 1 }),
    },
    stageHistory: [],
    trials: 0,
  };
}

// セーブから読んだ状態を、今のプロフィールと端末に合わせて整える（壊れた値も直す）
export function normalizeFlashState(raw, profile, frameMs) {
  const base = createFlashState(profile);
  const s = raw && typeof raw === 'object' ? raw : {};
  const fl = profile.flash;
  const pickStair = (key, max) => {
    const v = s.stairs && s.stairs[key];
    const st = v && Number.isFinite(v.level) ? { ...base.stairs[key], ...v } : base.stairs[key];
    return withMax(st, max);
  };
  return {
    stage: Number.isInteger(s.stage) ? Math.min(MAX_STAGE, Math.max(1, s.stage)) : 1,
    stairs: {
      duration: pickStair('duration', maxDurationLevel(fl, frameMs)),
      ecc: pickStair('ecc', fl.eccLevels.length - 1),
      distract: pickStair('distract', fl.distractorLevels.length - 1),
    },
    stageHistory: Array.isArray(s.stageHistory) ? s.stageHistory.filter((x) => typeof x === 'boolean').slice(-STAGE_RULE.window) : [],
    trials: Number.isInteger(s.trials) ? s.trials : 0,
  };
}

// 鏡に映った偽像の方向（上下反転。左右の真横は自分自身に重なるので反対側へ）
export function reflectedDir(dir) {
  const m = (4 - dir + DIR_COUNT) % DIR_COUNT;
  return m === dir ? (dir + 4) % DIR_COUNT : m;
}

export function makeTrial(state, profile, rng, { frameMs, theme = 'corridor' }) {
  const fl = profile.flash;
  const stage = state.stage;
  const pattern = FOCUS_PATTERN[stage];
  const focus = pattern[state.trials % pattern.length];
  const durationLevel = state.stairs.duration.level;
  const intendedMs = durationMs(durationLevel, fl);
  const frames = msToFrames(intendedMs, frameMs);
  const emblem = rng.int(Math.min(fl.emblemCount, EMBLEMS.length));

  let target = null;
  let distractors = [];
  let reflection = null;
  if (stage >= 2) {
    const eccLevel = state.stairs.ecc.level;
    target = { dir: rng.int(DIR_COUNT), ecc: fl.eccLevels[eccLevel] };
    if (stage >= 3) {
      const dl = state.stairs.distract.level;
      const n = Math.min(DIR_COUNT - 1, fl.distractorLevels[dl]);
      const dirs = rng.shuffle([...Array(DIR_COUNT).keys()].filter((d) => d !== target.dir)).slice(0, n);
      distractors = dirs.map((dir) => ({
        dir,
        ecc: rng.pick(fl.eccLevels),
        kind: dl >= fl.fakeFromLevel && rng.next() < 0.5 ? 'fake' : 'bat',
      }));
    }
    if (theme === 'lake' && stage >= fl.reflectionFromStage) {
      const rd = reflectedDir(target.dir);
      if (!distractors.some((d) => d.dir === rd)) reflection = { dir: rd, ecc: target.ecc };
    }
  }

  return {
    stage,
    focus,
    theme,
    emblem,
    target,
    distractors,
    reflection,
    durationLevel,
    intendedMs,
    frames,
    fixationMs: rng.range(fl.fixationMs[0], fl.fixationMs[1]),
  };
}

export function judge(trial, answer) {
  const emblemOk = answer.emblem === trial.emblem;
  const dirOk = trial.target ? answer.dir === trial.target.dir : null;
  return { emblemOk, dirOk, success: emblemOk && dirOk !== false };
}

// 結果を反映した新しい状態を返す。skipStair: フレーム落ちなどで表示時間が保証できなかった回は階段を動かさない
export function applyResult(state, trial, result, profile, { skipStair = false } = {}) {
  const stairs = { ...state.stairs };
  if (!skipStair) stairs[trial.focus] = updateStaircase(stairs[trial.focus], result.success);
  let stage = state.stage;
  let stageHistory = [...state.stageHistory, result.success].slice(-STAGE_RULE.window);
  let stageChange = 0;
  if (stageHistory.length >= STAGE_RULE.minTrials) {
    const acc = stageHistory.filter(Boolean).length / stageHistory.length;
    if (acc >= STAGE_RULE.promoteAt && stage < MAX_STAGE) {
      stage += 1;
      stageChange = 1;
      stairs.duration = ease(stairs.duration, profile.flash.stagePromoteEase);
    } else if (stageHistory.length >= STAGE_RULE.window && acc <= STAGE_RULE.demoteAt && stage > 1) {
      stage -= 1;
      stageChange = -1;
    }
    if (stageChange) stageHistory = [];
  }
  return { state: { stage, stairs, stageHistory, trials: state.trials + 1 }, stageChange };
}

// 演出用：難しさを 0（最初）〜1（1フレーム）で表す。ランタンの炎の大きさなどに使う
export function darkness(state) {
  const d = state.stairs.duration;
  return d.max > 0 ? Math.min(1, d.level / d.max) : 0;
}
