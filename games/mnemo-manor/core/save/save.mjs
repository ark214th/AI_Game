// セーブデータ。ストレージそのものは外から渡す（テストではメモリ上の偽物を使う）。

import { SAVE_KEY, LOG_LIMIT, SHOP } from '../../config/tuning.mjs';

export const SAVE_VERSION = 1;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    profile: 'adult',
    sound: true,
    flash: {},          // プロフィールごとの閃光の状態 { adult: {...}, child: {...} }
    altar: {},          // プロフィールごとの祭壇の階段
    recommend: {},      // プロフィールごとのおすすめ品数
    stats: {},          // プロフィールごとの記録 { runs, items, bestItems, completed }
    meta: defaultMeta(), // 館（金貨、部屋の数、油壺、記憶の灯）
    log: [],            // 1回ごとの記録（表示時間の狙いと実測を含む）
  };
}

export function defaultMeta() {
  return { gold: 0, rooms: SHOP.startRooms, oilUp: 0, lampUp: 0 };
}

const int = (v, lo, hi, d) => (Number.isInteger(v) ? Math.max(lo, Math.min(hi, v)) : d);

export function sanitize(raw) {
  const s = defaultSave();
  if (!raw || typeof raw !== 'object') return s;
  if (raw.profile === 'adult' || raw.profile === 'child') s.profile = raw.profile;
  if (typeof raw.sound === 'boolean') s.sound = raw.sound;
  if (raw.flash && typeof raw.flash === 'object') s.flash = raw.flash;
  if (raw.stats && typeof raw.stats === 'object') s.stats = raw.stats;
  if (raw.altar && typeof raw.altar === 'object') s.altar = raw.altar;
  if (raw.recommend && typeof raw.recommend === 'object') s.recommend = raw.recommend;
  const m = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  s.meta = {
    gold: int(m.gold, 0, 1e7, 0),
    rooms: int(m.rooms, SHOP.startRooms, SHOP.startRooms + SHOP.room.length, SHOP.startRooms),
    oilUp: int(m.oilUp, 0, SHOP.oil.length, 0),
    lampUp: int(m.lampUp, 0, SHOP.lamp.length, 0),
  };
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
  return { runs: 0, items: 0, bestItems: 0, completed: 0, ...(st && typeof st === 'object' ? st : {}) };
}

export function exportJson(save) {
  return JSON.stringify({ app: 'mnemo-manor', exportedAt: new Date().toISOString(), ...save }, null, 1);
}

export function importJson(text) {
  const raw = JSON.parse(text);
  if (!raw || raw.app !== 'mnemo-manor') throw new Error('記憶の館のデータではありません');
  return sanitize(raw);
}
