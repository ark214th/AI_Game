// セーブデータ。ストレージそのものは外から渡す（テストではメモリ上の偽物を使う）。

import { SAVE_KEY, LOG_LIMIT } from '../../config/tuning.mjs';

export const SAVE_VERSION = 1;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    profile: 'adult',
    sound: true,
    flash: {},          // プロフィールごとの閃光の状態 { adult: {...}, child: {...} }
    stats: {},          // プロフィールごとの記録 { adult: { dives, bestCombo, treasures } }
    log: [],            // 1回ごとの記録（表示時間の狙いと実測を含む）
  };
}

export function sanitize(raw) {
  const s = defaultSave();
  if (!raw || typeof raw !== 'object') return s;
  if (raw.profile === 'adult' || raw.profile === 'child') s.profile = raw.profile;
  if (typeof raw.sound === 'boolean') s.sound = raw.sound;
  if (raw.flash && typeof raw.flash === 'object') s.flash = raw.flash;
  if (raw.stats && typeof raw.stats === 'object') s.stats = raw.stats;
  if (Array.isArray(raw.log)) s.log = raw.log.slice(-LOG_LIMIT);
  return s;
}

export function loadSave(storage) {
  try {
    const text = storage && storage.getItem(SAVE_KEY);
    return sanitize(text ? JSON.parse(text) : null);
  } catch {
    return defaultSave();
  }
}

export function writeSave(storage, save) {
  try {
    storage && storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function pushLog(save, entry) {
  save.log.push(entry);
  if (save.log.length > LOG_LIMIT) save.log.splice(0, save.log.length - LOG_LIMIT);
}

export function statsFor(save, profileId) {
  const st = save.stats[profileId];
  return { dives: 0, bestCombo: 0, treasures: 0, ...(st && typeof st === 'object' ? st : {}) };
}

export function exportJson(save) {
  return JSON.stringify({ app: 'mnemo-manor', exportedAt: new Date().toISOString(), ...save }, null, 1);
}

export function importJson(text) {
  const raw = JSON.parse(text);
  if (!raw || raw.app !== 'mnemo-manor') throw new Error('記憶の館のデータではありません');
  return sanitize(raw);
}
