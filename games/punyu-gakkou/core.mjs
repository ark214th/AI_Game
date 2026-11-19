// ぷにゅの がっこう：がめんに よらない きまり（テストできる ところ）
import { ITEMS, ROOM, SPECIES, WALLS, FLOORS } from '../fushigi-pet-hotel/data.mjs';
import { BAG_ITEMS, DECOYS, SHOP, STICKERS, SONGS, CRAFT_PARTS, CRAFT_BASES, CRAFT_COLORS, CRAFT_MAX_PARTS, OUTFITS, FEEDBACK, FREE_WALLS, FREE_FLOORS } from './data.mjs';
import { DAYS, SUBJECTS } from './story.mjs';

export const SAVE_KEY = 'punyu-gakkou-v1';
const clampN = (v, a, b) => Number.isFinite(v) ? Math.max(a, Math.min(b, Math.round(v))) : a;

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
    best: { rope: 0 },    // ダンスは きょくの id ごとの ★
    feedback: [],         // { day, pick }（おためしばんの なごり）
    week: { day: 1, cleared: false, weeks: 0 },   // つぎに あそぶ ようび（1〜5）
    diary: {},            // ようび → { lines, pic, stars, friend }
    costume: null,        // はっぴょうかいの いしょう { hat, cape, deco }
    poster: null,         // はっぴょうかいの ポスター（dataURL）
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
  if (raw.best && typeof raw.best === 'object') for (const k of ['rope', ...Object.keys(SONGS)]) if (Number.isFinite(raw.best[k])) s.best[k] = clampN(raw.best[k], 0, 99);
  const w = raw.week;
  if (w && typeof w === 'object') {
    if (Number.isInteger(w.day) && w.day >= 1 && w.day <= 5) s.week.day = w.day;
    s.week.cleared = !!w.cleared;
    if (Number.isInteger(w.weeks) && w.weeks >= 0) s.week.weeks = w.weeks;
  }
  if (raw.diary && typeof raw.diary === 'object') for (let d = 1; d <= 5; d++) {
    const e = raw.diary[d];
    if (e && Array.isArray(e.lines)) s.diary[d] = { lines: e.lines.filter(l => typeof l === 'string').slice(0, 6), pic: typeof e.pic === 'string' && e.pic.startsWith('data:image/') ? e.pic : null, stars: clampN(e.stars, 0, 3), friend: typeof e.friend === 'string' ? e.friend : null };
  }
  s.costume = normalizeCostume(raw.costume);
  if (typeof raw.poster === 'string' && raw.poster.startsWith('data:image/')) s.poster = raw.poster;
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
// その ひ ランドセルに いれる もの（おなじ ものは 1かいだけ）
export function dayNeeds(day) {
  const d = DAYS[day];
  const out = [];
  for (const p of d.periods) {
    if (!p) continue;
    const item = p.id === 'recital' ? 'costumebag' : SUBJECTS[p.id].item;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}
// ちらばる もの：いる もの ＋ いらない もの（ぜんぶで 6こ）。seed で いつも おなじ
export function bagChoices(day, seed = 0) {
  const needs = dayNeeds(day);
  const decoys = [...DECOYS].sort((a, b) => rand(a.id.length * 31 + day * 7 + seed) - rand(b.id.length * 31 + day * 7 + seed));
  const list = [...needs.map(id => BAG_ITEMS.find(b => b.id === id)), ...decoys.slice(0, 6 - needs.length)];
  return list.sort((a, b) => rand(hs(a.id) + day * 3 + seed) - rand(hs(b.id) + day * 3 + seed)).map(x => ({ ...x, need: needs.includes(x.id) }));
}
export function tryBag(packed, id, needs) {
  if (!needs.includes(id)) return 'no';
  if (packed.includes(id)) return 'dup';
  packed.push(id);
  return 'ok';
}
export const bagDone = (packed, needs) => needs.every(id => packed.includes(id));
const hs = str => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7);
const rand = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------- ダンス ----------
export const COUNT_IN = 4;          // さいしょの 4はくは かぞえるだけ
export const beatOf = id => 60 / SONGS[id].bpm;
// part 1 は まえ はんぶん（れんしゅう よう）
export const songBars = (id, part = 0) => part === 1 ? [...SONGS[id].bars.slice(0, SONGS[id].half), 'END'] : SONGS[id].bars;
export const songBeats = (id, part = 0) => COUNT_IN + songBars(id, part).length * 4;
export function danceChart(id = 'kirakira', part = 0) {
  const song = SONGS[id], beat = beatOf(id), notes = [];
  songBars(id, part).forEach((k, bar) => {
    for (const [b, lane] of song.pat[k]) notes.push({ t: (COUNT_IN + bar * 4 + b) * beat, lane, beat: COUNT_IN + bar * 4 + b });
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

// ---------- かけっこ ----------
// タッチ 1かいで スピードが あがり、だんだん おちる。ともだちは だいたい おなじ はやさで はしる
export const RACE_LEN = 100;
export const raceTap = v => Math.min(34, v + 6);
export const raceDecay = (v, dt) => Math.max(0, v - v * 1.6 * dt);
export const raceRank = (me, others) => 1 + others.filter(o => o > me).length;
export const raceStars = rank => rank === 1 ? 3 : rank === 2 ? 2 : 1;

// ---------- さんすう（かぞえっこ） ----------
// q：{ kind: 'count'|'add', a, b, icon, answer, choices }
const MATH_ICONS = ['🍎', '⭐', '🌸', '🐟', '🍓', '🎈', '🍩', '🐞'];
export function mathQuestions(seed = 0) {
  const r = k => rand(seed * 13 + k);
  const qs = [];
  const plan = ['count', 'count', 'count', 'add', 'add'];
  plan.forEach((kind, i) => {
    let a, b = 0;
    if (kind === 'count') a = 3 + Math.floor(r(i) * (4 + i * 2));          // 3〜 だんだん ふえる
    else { a = 1 + Math.floor(r(i) * 5); b = 1 + Math.floor(r(i + 50) * (9 - a)); }
    a = Math.min(a, 10); const answer = a + b;
    const set = new Set([answer]);
    for (let k = 1; set.size < 3; k++) { const d = answer + (r(i * 7 + k) < 0.5 ? -1 : 1) * (1 + Math.floor(r(i * 3 + k) * 2)); if (d >= 1 && d <= 12) set.add(d); }
    const choices = [...set].sort((x, y) => r(x + i) - r(y + i));
    qs.push({ kind, a, b, icon: MATH_ICONS[Math.floor(r(i + 9) * MATH_ICONS.length)], answer, choices });
  });
  return qs;
}

// ---------- こくご（ひらがな あて） ----------
export const WORDS = [
  ['りんご', '🍎'], ['いちご', '🍓'], ['すいか', '🍉'], ['ぶどう', '🍇'], ['さかな', '🐟'], ['うさぎ', '🐰'], ['ねこ', '🐱'], ['いぬ', '🐶'],
  ['くま', '🐻'], ['かさ', '☂️'], ['くつ', '👟'], ['たまご', '🥚'], ['とけい', '⏰'], ['ほし', '⭐'], ['はな', '🌸'], ['つき', '🌙'],
  ['くるま', '🚗'], ['ふね', '⛵'], ['かめ', '🐢'], ['きのこ', '🍄'],
];
const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん';
export function kokugoQuestions(seed = 0, n = 6) {
  const r = k => rand(seed * 17 + k);
  const words = [...WORDS].sort((a, b) => r(a[0].charCodeAt(0)) - r(b[0].charCodeAt(0))).slice(0, n);
  return words.map(([word, icon], i) => {
    const chars = [...word], hole = Math.floor(r(i + 3) * chars.length), answer = chars[hole];
    const set = new Set([answer]);
    for (let k = 1; set.size < 3; k++) set.add(KANA[Math.floor(r(i * 11 + k) * KANA.length)]);
    return { word, icon, hole, answer, choices: [...set].sort((x, y) => r(x.charCodeAt(0) + i) - r(y.charCodeAt(0) + i)) };
  });
}
export const quizStars = misses => misses === 0 ? 3 : misses <= 2 ? 2 : 1;

// ---------- いしょう ----------
export const COSTUME_HATS = ['crown', 'tiara', 'star', 'flower', 'bow', 'top'];
export const COSTUME_CAPES = ['#ff6f91', '#7fc7ff', '#ffd84a', '#b58cff', '#8fd36a', '#ffffff'];
export const COSTUME_DECOS = ['sparkle', 'heart', 'note', 'none'];
export const defaultCostume = () => ({ hat: 'crown', cape: '#ff6f91', deco: 'sparkle' });
export function normalizeCostume(c) {
  if (!c || typeof c !== 'object') return null;
  return { hat: COSTUME_HATS.includes(c.hat) ? c.hat : 'crown', cape: COSTUME_CAPES.includes(c.cape) ? c.cape : COSTUME_CAPES[0], deco: COSTUME_DECOS.includes(c.deco) ? c.deco : 'sparkle' };
}

// ---------- 1しゅうかん ----------
// その ひが おわった：にっきを のこして つぎの ひへ（きんようびの つぎは また げつようびから）
export function finishDay(s, day, entry) {
  s.diary[day] = entry;
  s.days++;
  if (day >= 5) { s.week.cleared = true; s.week.weeks++; s.week.day = 1; }
  else s.week.day = day + 1;
}
// にっきの ことば
export function diaryLines(day, r, friendName) {
  const L = [];
  const did = { draw: 'おえかき', dance: 'ダンス', craft: 'こうさく', math: 'さんすう', kokugo: 'こくご', costume: 'いしょう づくり', music: 'けんばんハーモニカ', race: 'かけっこ', rehearsal: 'リハーサル', recital: 'はっぴょうかい' };
  if (day === 1) L.push('はじめて がっこうに いったよ。');
  if (day === 2) L.push('きららの おたんじょうびを おいわい したよ。');
  if (day === 3) L.push('はっぴょうかいの いしょうを つくったよ。');
  if (day === 4) L.push('ちゃぷと ダンスの れんしゅうを したよ。');
  if (day === 5) L.push('ダンス はっぴょうかい！ みんなで おどったよ。');
  const done = Object.keys(did).filter(k => r[k] && !(day === 3 && k === 'costume') && !(day === 5 && k === 'recital'));
  if (done.length) L.push(done.slice(0, 3).map(k => did[k]).join('、 ') + ' を したよ。');
  if (friendName) L.push(`${friendName}と なかよく あそんだよ。`);
  if (r.danceStars) L.push(`ダンスは ${'★'.repeat(r.danceStars)}${'☆'.repeat(3 - r.danceStars)} だった！`);
  L.push(day === 5 ? 'さいこうの 1しゅうかん だった！' : 'あしたも たのしみ！');
  return L;
}
