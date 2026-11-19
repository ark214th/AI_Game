// ぷにゅの がっこう：がめんに よらない きまり（テストできる ところ）
import { ITEMS, ROOM, SPECIES, WALLS, FLOORS } from '../fushigi-pet-hotel/data.mjs';
import { BAG_ITEMS, SHOP, STICKERS, DANCE_BPM, CRAFT_PARTS, CRAFT_BASES, CRAFT_COLORS, CRAFT_MAX_PARTS, OUTFITS, FEEDBACK, FREE_WALLS, FREE_FLOORS, RECESS } from './data.mjs';

export const SAVE_KEY = 'punyu-gakkou-v1';

// ---------- ほぞん ----------
// ぷにゅの へやの かぐ。mypic（かいた え）と mycraft（つくった もの）は ref で どれかを さす
export const CUSTOM_ITEMS = {
  mypic: { name: 'ぷにゅの え', zone: 'wall', w: 200, h: 150, tags: [] },
  mycraft: { name: 'つくった もの', zone: 'floor', w: 150, h: 160, tags: [] },
};
export const itemDef = id => ITEMS[id] || CUSTOM_ITEMS[id];

export function defaultRoom() {
  return {
    wall: 'pink', floor: 'wood',
    items: [
      { id: 'window', x: 520, y: 175, c: 1 },
      { id: 'bed', x: 190, y: 560, c: 0 },
      { id: 'rug', x: 560, y: 540, c: 1 },
    ],
  };
}

export function newSave() {
  return {
    v: 1, sound: true, days: 0,
    outfit: 'ribbon',
    stickers: 0,
    room: defaultRoom(),
    owned: {},            // おみせで かった かぐ（id → かず）
    pictures: [],         // かいた え（dataURL）
    crafts: [],           // つくった もの
    best: { dance: 0, rope: 0 },
    feedback: [],         // { day, pick }
  };
}

const MAX_PICS = 6;
export function normalize(raw) {
  const s = newSave();
  if (!raw || typeof raw !== 'object') return s;
  if (typeof raw.sound === 'boolean') s.sound = raw.sound;
  if (Number.isInteger(raw.days) && raw.days >= 0) s.days = raw.days;
  if (OUTFITS.some(o => o.id === raw.outfit)) s.outfit = raw.outfit;
  if (Number.isFinite(raw.stickers)) s.stickers = Math.max(0, Math.min(999, Math.floor(raw.stickers)));
  if (Array.isArray(raw.pictures)) s.pictures = raw.pictures.filter(p => typeof p === 'string' && p.startsWith('data:image/')).slice(-MAX_PICS);
  if (Array.isArray(raw.crafts)) s.crafts = raw.crafts.map(normalizeCraft).filter(Boolean).slice(-MAX_PICS);
  if (raw.owned && typeof raw.owned === 'object') for (const [k, n] of Object.entries(raw.owned)) if (ITEMS[k] && Number.isInteger(n) && n > 0) s.owned[k] = Math.min(9, n);
  if (raw.best && typeof raw.best === 'object') for (const k of Object.keys(s.best)) if (Number.isFinite(raw.best[k])) s.best[k] = raw.best[k];
  if (Array.isArray(raw.feedback)) s.feedback = raw.feedback.filter(f => f && FEEDBACK.some(x => x.id === f.pick)).slice(-30);
  const r = raw.room;
  if (r && typeof r === 'object') {
    if (WALLS[r.wall]) s.room.wall = r.wall;
    if (FLOORS[r.floor]) s.room.floor = r.floor;
    if (Array.isArray(r.items)) {
      s.room.items = r.items.filter(it => it && itemDef(it.id) && Number.isFinite(it.x) && Number.isFinite(it.y))
        .filter(it => it.id === 'mypic' ? s.pictures[it.ref] : it.id === 'mycraft' ? s.crafts[it.ref] : true)
        .map(it => clampItem({ id: it.id, x: it.x, y: it.y, c: it.c, ref: it.ref }));
    }
  }
  return s;
}

// ---------- へやの かぐ ----------
export function clampItem(it) {
  const d = itemDef(it.id);
  const halfW = Math.min(d.w / 2, ROOM.w / 2);
  it.x = Math.max(halfW, Math.min(ROOM.w - halfW, it.x));
  if (d.zone === 'wall') it.y = Math.max(ROOM.wallTop + d.h / 2, Math.min(ROOM.wallLow - d.h / 2 + 30, it.y));
  else it.y = Math.max(ROOM.floorTop + (d.flat ? d.h / 2 : 0), Math.min(ROOM.floorBottom, it.y));
  if (d.colors) it.c = ((it.c || 0) % d.colors.length + d.colors.length) % d.colors.length; else delete it.c;
  if (it.ref === undefined || !CUSTOM_ITEMS[it.id]) delete it.ref;
  return it;
}
export const placedCount = (room, id) => room.items.filter(it => it.id === id).length;
// おみせの かぐで、へやに おいていない ぶん（しまってある）
export const stored = (s, id) => (s.owned[id] || 0) - placedCount(s.room, id);
export const priceOf = id => SHOP.find(x => x.id === id)?.price ?? null;

// かう：シールが たりれば へると いっしょに へやに おく
export function buy(s, id, x = 500, y = 500) {
  const p = priceOf(id);
  if (p === null || s.stickers < p) return null;
  s.stickers -= p;
  s.owned[id] = (s.owned[id] || 0) + 1;
  const d = ITEMS[id];
  const it = clampItem({ id, x, y: d.zone === 'wall' ? 180 : y, c: 0 });
  s.room.items.push(it);
  return it;
}
// しまってある かぐを だす
export function takeOut(s, id, x = 500, y = 500) {
  if (stored(s, id) <= 0) return null;
  const it = clampItem({ id, x, y: ITEMS[id].zone === 'wall' ? 180 : y, c: 0 });
  s.room.items.push(it);
  return it;
}
// しまう（ベッドは しまえない。ねる ところが なくなるから）
export function putAway(s, it) {
  if (it.id === 'bed') return false;
  const i = s.room.items.indexOf(it);
  if (i < 0) return false;
  s.room.items.splice(i, 1);
  return true;
}
export function recolor(it) {
  const d = itemDef(it.id);
  if (!d.colors) return false;
  it.c = ((it.c || 0) + 1) % d.colors.length;
  return true;
}
// かいた え・つくった ものを へやに かざる（まえの ものは そのまま のこす）
export function hangPicture(s, dataUrl) {
  s.pictures.push(dataUrl);
  if (s.pictures.length > MAX_PICS) { s.pictures.shift(); shiftRefs(s, 'mypic'); }
  const ref = s.pictures.length - 1;
  const spot = [[300, 170], [760, 170], [520, 120], [880, 200], [150, 200]].find(([x]) => !s.room.items.some(it => itemDef(it.id).zone === 'wall' && Math.abs(it.x - x) < 150)) || [760, 170];
  const it = clampItem({ id: 'mypic', x: spot[0], y: spot[1], ref });
  s.room.items.push(it);
  return it;
}
export function placeCraft(s, craft) {
  s.crafts.push(craft);
  if (s.crafts.length > MAX_PICS) { s.crafts.shift(); shiftRefs(s, 'mycraft'); }
  const ref = s.crafts.length - 1;
  const it = clampItem({ id: 'mycraft', x: 820, y: 470, ref });
  s.room.items.push(it);
  return it;
}
// ふるい ものを けしたら ref を ずらす
function shiftRefs(s, id) {
  s.room.items = s.room.items.filter(it => it.id !== id || it.ref > 0);
  for (const it of s.room.items) if (it.id === id) it.ref--;
}

// ともだちが へやを みた ときの ことば
export function friendComments(room, sp) {
  const likes = SPECIES[sp]?.likes || [];
  const out = [];
  if (room.items.some(it => it.id === 'mypic')) out.push({ kind: 'pic', text: 'ぷにゅの え だ！ じょうず〜！' });
  if (room.items.some(it => it.id === 'mycraft')) out.push({ kind: 'craft', text: 'つくった もの かざったんだね！' });
  const seen = new Set();
  for (const it of room.items) {
    const d = ITEMS[it.id];
    if (!d || seen.has(it.id)) continue;
    if (d.tags.some(t => likes.includes(t))) { seen.add(it.id); out.push({ kind: 'like', id: it.id, text: `${d.name} すてき！ だいすき！` }); }
  }
  const wallLike = WALLS[room.wall].tags.some(t => likes.includes(t)) || FLOORS[room.floor].tags.some(t => likes.includes(t));
  if (wallLike) out.push({ kind: 'like', text: 'この へやの いろ すき〜！' });
  if (!out.some(c => c.kind === 'like')) {
    const any = room.items.find(it => ITEMS[it.id] && !['bed', 'window', 'rug'].includes(it.id));
    out.push({ kind: 'ok', text: any ? `${ITEMS[any.id].name} いいね！` : 'すてきな へや だね！' });
  }
  return out;
}
// すきな ものが あれば おおよろこび
export const friendLoves = (room, sp) => friendComments(room, sp).some(c => c.kind === 'like');

// ---------- ランドセル ----------
// 'ok'：いれた ／ 'no'：いらない もの ／ 'dup'：もう はいってる
export function tryBag(packed, id) {
  const it = BAG_ITEMS.find(b => b.id === id);
  if (!it) return 'no';
  if (!it.need) return 'no';
  if (packed.includes(id)) return 'dup';
  packed.push(id);
  return 'ok';
}
export const bagDone = packed => BAG_ITEMS.filter(b => b.need).every(b => packed.includes(b.id));

// ---------- ダンス ----------
export const BEAT = 60 / DANCE_BPM;
export const COUNT_IN = 4;          // さいしょの 4はくは かぞえるだけ
// 1しょうせつの ならび [はく, ボタン]。0 ばんざい・1 ひだり・2 みぎ・3 くるり
const BARS = {
  A: [[0, 0], [2, 0]],
  A2: [[0, 1], [2, 2]],
  B: [[0, 1], [1, 2], [2, 1], [3, 2]],
  C: [[0, 0], [1, 0], [2, 3]],
  D: [[0, 2], [1, 2], [2, 1], [3, 1]],
  E: [[0, 3], [2, 0], [3, 0]],
  F: [[0, 1], [0.5, 2], [1, 1], [2, 0], [3, 3]],
  G: [[0, 2], [0.5, 1], [1, 2], [2, 0], [3, 0]],
  END: [[0, 0]],
};
const SONG = ['A', 'A2', 'A', 'A2', 'B', 'C', 'B', 'E', 'D', 'C', 'D', 'E', 'F', 'C', 'G', 'E', 'END'];
export const SONG_BEATS = COUNT_IN + SONG.length * 4;

export function danceChart() {
  const notes = [];
  SONG.forEach((k, bar) => {
    for (const [b, lane] of BARS[k]) notes.push({ t: (COUNT_IN + bar * 4 + b) * BEAT, lane, beat: COUNT_IN + bar * 4 + b });
  });
  return notes;
}
export const HIT = { perfect: 0.1, good: 0.2 };
export function judge(dt) {
  const a = Math.abs(dt);
  if (a <= HIT.perfect) return 'perfect';
  if (a <= HIT.good) return 'good';
  return null;
}
// いちばん ちかい まだの おんぷを さがす（その ボタンの れつだけ）
export function findNote(notes, lane, now) {
  let best = null;
  for (const n of notes) {
    if (n.done || n.lane !== lane) continue;
    const dt = now - n.t;
    if (Math.abs(dt) <= HIT.good && (!best || Math.abs(dt) < Math.abs(now - best.t))) best = n;
  }
  return best;
}
export function danceRate(perfect, good, total) { return total ? (perfect + good * 0.6) / total : 0; }
export function danceStars(rate) { return rate >= 0.88 ? 3 : rate >= 0.7 ? 2 : rate >= 0.5 ? 1 : 0; }

// ---------- なわとび ----------
// なわは ROPE_PERIOD びょうで 1しゅう。phase 0.5 で あしもとを とおる
export const ROPE_GOAL = 10;
// 3かい とぶ ごとに すこし はやく なる（まいかい かわると リズムが とりにくい）
export const ropePeriod = jumps => Math.max(1.0, 1.4 - Math.floor(jumps / 3) * 0.1);
export const JUMP_TIME = 0.5;                                        // とんでいる じかん
export const ROPE_GRACE = 0.14;                                      // なわが とおってから すこしなら おくれて とんでも セーフ
export const ROPE_LEAD = 0.22;                                       // なわが とおる この びょう まえに とぶと ちょうど いい
// なわが あしもとを とおった とき、とんでから jumpT びょう たっていれば こえられる（とびはじめ と おりぎわ は だめ）
export const ropeClear = jumpT => jumpT !== null && jumpT >= 0.03 && jumpT <= JUMP_TIME - 0.02;
export const ropeStars = misses => misses === 0 ? 3 : misses <= 2 ? 2 : 1;
export const tagStars = sec => sec <= 25 ? 3 : sec <= 45 ? 2 : 1;

// ---------- こうさく ----------
export function newCraft(base = 'box') { return { base, color: CRAFT_COLORS[0], parts: [] }; }
export function addPart(craft, type, x = 0, y = -55, color = '#ff5d86') {
  if (craft.parts.length >= CRAFT_MAX_PARTS || !CRAFT_PARTS.some(p => p.id === type)) return null;
  const p = clampPart({ type, x, y, color });
  craft.parts.push(p);
  return p;
}
// ぶひんは だいの まわり だけに おける（ざひょうは だいの あしもとが 0,0。うえが マイナス）
export function clampPart(p) {
  p.x = Math.max(-95, Math.min(95, Math.round(p.x)));
  p.y = Math.max(-175, Math.min(10, Math.round(p.y)));
  return p;
}
export function normalizeCraft(c) {
  if (!c || !CRAFT_BASES.some(b => b.id === c.base)) return null;
  const out = { base: c.base, color: CRAFT_COLORS.includes(c.color) ? c.color : CRAFT_COLORS[0], parts: [] };
  if (Array.isArray(c.parts)) for (const p of c.parts.slice(0, CRAFT_MAX_PARTS)) {
    if (p && CRAFT_PARTS.some(x => x.id === p.type) && Number.isFinite(p.x) && Number.isFinite(p.y)) out.parts.push(clampPart({ type: p.type, x: p.x, y: p.y, color: typeof p.color === 'string' ? p.color : '#ff5d86' }));
  }
  return out;
}
export const craftReady = c => c.parts.length >= 2;

// ---------- シール ----------
export function dayStickers(r) {
  let n = 0;
  if (r.draw) n += STICKERS.draw;
  if (r.recess) n += STICKERS.recess;
  if (r.lunch) n += STICKERS.lunch;
  if (r.craft) n += STICKERS.craft;
  if (r.dance) n += STICKERS.danceBase + (r.danceStars || 0);
  return n;
}
export const recessOf = game => RECESS.find(r => r.game === game);
