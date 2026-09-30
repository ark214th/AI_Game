// ホテルの しくみ（画面や音とは切りはなした計算だけ。node --test で確かめられる）
import { SPECIES, SPECIES_IDS, ITEMS, WALLS, FLOORS, FOODS, TOYS, SPOTS, TAGS, ROOM, ROOM_HEARTS, MAX_ROOMS, GUESTS_PER_DAY, LETTER_KEEP } from './data.mjs';

// ねる のは いつも さいご。ほかの 4つから 3つ えらぶ
export const CARE = ['food', 'bath', 'pet', 'play'];
export const NEED_KINDS = [...CARE, 'sleep'];

const newRoom = (wall = 'cream', floor = 'wood', items = []) => ({ wall, floor, items });
const newZukan = () => ({ met: 0, fav: false, dislike: false, spot: false, bath: false, toy: false, tags: [] });

export function newSave() {
  return {
    v: 1,
    day: 1,
    hearts: 0,
    owned: { bed: 2, window: 2, rug: 1, ueki: 1, doll: 1 },
    walls: ['cream', 'pink', 'mizu'],
    floors: ['wood', 'carpet'],
    rooms: [
      newRoom('cream', 'wood', [{ id: 'bed', x: 300, y: 470 }, { id: 'window', x: 640, y: 170 }]),
      newRoom('pink', 'carpet', [{ id: 'bed', x: 300, y: 470 }, { id: 'window', x: 640, y: 170 }]),
    ],
    zukan: Object.fromEntries(SPECIES_IDS.map(id => [id, newZukan()])),
    letters: [],
    today: null,
    sound: true,
    tips: {},
  };
}

const num = (v, d, min = 0) => (Number.isFinite(v) && v >= min ? Math.floor(v) : d);
const isGift = g => g && ((g.kind === 'item' && ITEMS[g.id]) || (g.kind === 'wall' && WALLS[g.id]) || (g.kind === 'floor' && FLOORS[g.id]));

// 保存データを よみこむ（こわれていても あそべるように ととのえる）
export function normalize(raw) {
  const s = newSave();
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return s;
  s.day = num(raw.day, 1, 1);
  s.hearts = num(raw.hearts, 0);
  if (raw.owned && typeof raw.owned === 'object') {
    s.owned = {};
    for (const id of Object.keys(ITEMS)) { const n = num(raw.owned[id], 0); if (n) s.owned[id] = n; }
  }
  if (Array.isArray(raw.walls)) s.walls = [...new Set(['cream', ...raw.walls.filter(w => WALLS[w])])];
  if (Array.isArray(raw.floors)) s.floors = [...new Set(['wood', ...raw.floors.filter(f => FLOORS[f])])];
  if (Array.isArray(raw.rooms) && raw.rooms.length >= 2) {
    s.rooms = raw.rooms.slice(0, MAX_ROOMS).map(r => newRoom(
      WALLS[r?.wall] ? r.wall : 'cream',
      FLOORS[r?.floor] ? r.floor : 'wood',
      Array.isArray(r?.items) ? r.items.filter(it => ITEMS[it?.id] && Number.isFinite(it.x) && Number.isFinite(it.y)).map(it => clampItem({ id: it.id, x: it.x, y: it.y })) : [],
    ));
  }
  // おいてある数が もっている数を こえないように
  for (const id of Object.keys(ITEMS)) {
    let extra = placedCount(s, id) - (s.owned[id] || 0);
    for (let r = s.rooms.length - 1; r >= 0 && extra > 0; r--) {
      const items = s.rooms[r].items;
      for (let i = items.length - 1; i >= 0 && extra > 0; i--) if (items[i].id === id) { items.splice(i, 1); extra--; }
    }
  }
  if (raw.zukan && typeof raw.zukan === 'object') {
    for (const id of SPECIES_IDS) {
      const z = raw.zukan[id]; if (!z || typeof z !== 'object') continue;
      s.zukan[id] = {
        met: num(z.met, 0), fav: z.fav === true, dislike: z.dislike === true, spot: z.spot === true, bath: z.bath === true, toy: z.toy === true,
        tags: Array.isArray(z.tags) ? z.tags.filter(t => SPECIES[id].likes.includes(t)) : [],
      };
    }
  }
  if (Array.isArray(raw.letters)) {
    s.letters = raw.letters.filter(l => l && SPECIES[l.species] && Array.isArray(l.lines) && l.lines.every(x => typeof x === 'string'))
      .slice(-LETTER_KEEP).map(l => ({ species: l.species, day: num(l.day, 1, 1), lines: [...l.lines], gift: isGift(l.gift) ? { kind: l.gift.kind, id: l.gift.id } : null, read: l.read === true }));
  }
  s.sound = raw.sound !== false;
  s.tips = raw.tips && typeof raw.tips === 'object' ? { ...raw.tips } : {};
  if (raw.today && Array.isArray(raw.today.guests)) {
    const used = new Set();
    const guests = [];
    for (const g of raw.today.guests) {
      if (!SPECIES[g?.species] || !Number.isInteger(g.room) || g.room < -1 || g.room >= s.rooms.length) continue;
      if (!Array.isArray(g.needs) || !g.needs.length || !g.needs.every(n => NEED_KINDS.includes(n))) continue;
      if (g.room >= 0) { if (used.has(g.room)) continue; used.add(g.room); }
      guests.push({
        species: g.species, room: g.room, needs: [...g.needs], done: Math.min(num(g.done, 0), g.needs.length), hearts: num(g.hearts, 0),
        reacted: Array.isArray(g.reacted) ? g.reacted.filter(t => TAGS[t]) : [],
        wish: SPECIES[g.species].likes.includes(g.wish) ? g.wish : SPECIES[g.species].likes[0],
        log: g.log && typeof g.log === 'object' ? { ...g.log } : {},
      });
    }
    const queue = Array.isArray(raw.today.queue) ? raw.today.queue.filter(q => SPECIES[q]) : [];
    if (guests.length || queue.length) s.today = { guests, queue };
  }
  return s;
}

// ---------- 家具 ----------
export const placedCount = (s, id) => s.rooms.reduce((n, r) => n + r.items.filter(it => it.id === id).length, 0);
export const available = (s, id) => (s.owned[id] || 0) - placedCount(s, id);

export function clampItem(it) {
  const d = ITEMS[it.id];
  const halfW = Math.min(d.w / 2, ROOM.w / 2);
  it.x = Math.max(halfW, Math.min(ROOM.w - halfW, it.x));
  if (d.zone === 'wall') it.y = Math.max(ROOM.wallTop + d.h / 2, Math.min(ROOM.wallLow - d.h / 2 + 30, it.y));
  else it.y = Math.max(ROOM.floorTop + (d.flat ? d.h / 2 : 0), Math.min(ROOM.floorBottom, it.y));
  return it;
}

export function placeItem(s, roomIdx, id, x, y) {
  if (available(s, id) <= 0) return null;
  const it = clampItem({ id, x, y });
  s.rooms[roomIdx].items.push(it);
  return it;
}

export function removeItem(s, roomIdx, it) {
  const items = s.rooms[roomIdx].items, i = items.indexOf(it);
  if (i >= 0) items.splice(i, 1);
}

export function roomTags(room) {
  const tags = new Set([...WALLS[room.wall].tags, ...FLOORS[room.floor].tags]);
  for (const it of room.items) for (const t of ITEMS[it.id].tags) tags.add(t);
  return tags;
}

// お客さんが すきな しるしが へやに いくつ あるか（しゅるいの かず）
export function likedTags(room, species) {
  const tags = roomTags(room);
  return SPECIES[species].likes.filter(t => tags.has(t));
}

// へやの 中で お客さんが すきな 家具（かんそうに つかう）
export const likedItems = (room, species) => room.items.filter(it => ITEMS[it.id].tags.some(t => SPECIES[species].likes.includes(t)));
export const bedOf = room => room.items.filter(it => ITEMS[it.id].bed).sort((a, b) => b.y - a.y)[0] || null;

// ---------- 1にち ----------
function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pick = (a, rng) => a[Math.floor(rng() * a.length)];

// あさ：きょうの お客さんを きめて、1ぴきめが くる
export function startDay(s, rng = Math.random) {
  const ids = shuffle([...SPECIES_IDS], rng);
  const queue = [];
  for (let i = 0; i < GUESTS_PER_DAY; i++) queue.push(ids[i % ids.length]);
  s.today = { guests: [], queue };
  return arrive(s, rng);
}

// つぎの お客さんが くる（ロビーで まっている じょうたい：room = -1）
export function arrive(s, rng = Math.random) {
  if (!s.today?.queue.length) return -1;
  const species = s.today.queue.shift();
  const sp = SPECIES[species], z = s.zukan[species];
  // おねがいは まだ わかっていない すきなものを さきに
  const unknown = sp.likes.filter(t => !z.tags.includes(t));
  const g = {
    species, room: -1, needs: [...shuffle([...CARE], rng).slice(0, 3), 'sleep'], done: 0, hearts: 0, reacted: [],
    wish: pick(unknown.length ? unknown : sp.likes, rng), log: {},
  };
  s.today.guests.push(g);
  z.met++;
  return s.today.guests.length - 1;
}

// つぎの お客さんが きて いいか（まえの お客さんが へやに はいって、おせわを 1つ すませたら）
export function canArrive(s) {
  if (!s.today?.queue.length) return false;
  const gs = s.today.guests;
  return gs.every(g => g.room >= 0) && (!gs.length || gs[gs.length - 1].done >= 1);
}

export const freeRooms = s => s.rooms.map((_, i) => i).filter(i => guestAt(s, i) < 0);

// チェックイン：えらんだ へやに あんないする。すきな ものが あれば ハート
export function checkIn(s, gi, roomIdx) {
  const g = s.today?.guests[gi];
  if (!g || g.room >= 0 || roomIdx < 0 || roomIdx >= s.rooms.length || guestAt(s, roomIdx) >= 0) return null;
  g.room = roomIdx;
  const liked = likedTags(s.rooms[roomIdx], g.species);
  g.reacted.push(...liked);
  if (liked.length) { gain(s, g, liked.length); learnTags(s, g.species, liked); }
  g.log.likedRoom = liked.length > 0;
  return { liked, hearts: liked.length };
}

function gain(s, g, n) { s.hearts += n; g.hearts += n; }
function learnTags(s, species, tags) {
  const z = s.zukan[species];
  for (const t of tags) if (!z.tags.includes(t)) z.tags.push(t);
}

export const guestAt = (s, roomIdx) => (s.today ? s.today.guests.findIndex(g => g.room === roomIdx && roomIdx >= 0) : -1);
export const waitingGuest = s => (s.today ? s.today.guests.findIndex(g => g.room < 0) : -1);
export const needOf = g => (g && g.room >= 0 && g.done < g.needs.length ? g.needs[g.done] : null);
export const isHappy = g => g.room >= 0 && g.done >= g.needs.length;
export const allDone = s => !!s.today && !s.today.queue.length && s.today.guests.length > 0 && s.today.guests.every(isHappy);

function finishNeed(s, g, hearts) {
  g.done++;
  gain(s, g, hearts);
}

// ごはん：すきな ものなら ハート2、ふつうは 1、にがてなら たべない（しっぱいには しない）
export function feed(s, gi, food) {
  const g = s.today.guests[gi], sp = SPECIES[g.species], z = s.zukan[g.species];
  if (needOf(g) !== 'food') return { result: 'notNow', hearts: 0 };
  if (food === sp.dislike) { const learned = !z.dislike; z.dislike = true; g.log.dislike = true; return { result: 'dislike', hearts: 0, learned }; }
  if (food === sp.fav) { const learned = !z.fav; z.fav = true; g.log.food = 'fav'; finishNeed(s, g, 2); return { result: 'fav', hearts: 2, learned }; }
  g.log.food = 'ok';
  finishNeed(s, g, 1);
  return { result: 'ok', hearts: 1 };
}

// おふろ：おわったら よぶ。おふろ だいすきな子は ハート2
export function bathDone(s, gi) {
  const g = s.today.guests[gi], sp = SPECIES[g.species], z = s.zukan[g.species];
  if (needOf(g) !== 'bath') return { result: 'notNow', hearts: 0 };
  const learned = !z.bath; z.bath = true;
  const hearts = sp.bath === 'daisuki' ? 2 : 1;
  g.log.bath = true;
  finishNeed(s, g, hearts);
  return { result: sp.bath, hearts, learned };
}

// なでる：どこを なでたか。すきな ところを おおく なでたら ハート2
export function petDone(s, gi, favShare) {
  const g = s.today.guests[gi];
  if (needOf(g) !== 'pet') return { result: 'notNow', hearts: 0 };
  const hearts = favShare >= 0.5 ? 2 : 1;
  g.log.pet = hearts === 2 ? 'fav' : 'ok';
  finishNeed(s, g, hearts);
  return { result: g.log.pet, hearts };
}

// あそぶ：すきな おもちゃなら ハート2
export function playDone(s, gi, toy) {
  const g = s.today.guests[gi], sp = SPECIES[g.species], z = s.zukan[g.species];
  if (needOf(g) !== 'play' || !TOYS[toy]) return { result: 'notNow', hearts: 0 };
  const fav = toy === sp.toy;
  const learned = fav && !z.toy;
  if (fav) z.toy = true;
  g.log.play = { toy, fav };
  finishNeed(s, g, fav ? 2 : 1);
  return { result: fav ? 'fav' : 'ok', hearts: fav ? 2 : 1, learned };
}

// ねかしつけ：ベッドが あれば ぐっすり（ハート2）
export function sleepDone(s, gi) {
  const g = s.today.guests[gi];
  if (needOf(g) !== 'sleep') return { result: 'notNow', hearts: 0 };
  const bed = !!bedOf(s.rooms[g.room]);
  g.log.bed = bed;
  finishNeed(s, g, bed ? 2 : 1);
  return { result: bed ? 'bed' : 'floor', hearts: bed ? 2 : 1 };
}

// すきな ところを なでられた（はじめてなら ずかんに のる）
export function learnSpot(s, species) {
  const z = s.zukan[species]; const learned = !z.spot; z.spot = true; return learned;
}

// なでる ばしょ：からだの まんなかからの ずれ（からだの はんけい を 1 とする）
export function spotAt(dx, dy) {
  if (dy < -0.4) return 'atama';
  if (Math.abs(dx) > 0.42 && dy < 0.35) return 'hoppe';
  return 'onaka';
}

// かざりつけを かえたとき：すきな ものが ふえたら よろこぶ（1にち 1しゅるい 1かい）
export function decorReact(s, roomIdx) {
  const gi = guestAt(s, roomIdx);
  if (gi < 0) return null;
  const g = s.today.guests[gi];
  const fresh = likedTags(s.rooms[roomIdx], g.species).filter(t => !g.reacted.includes(t));
  if (!fresh.length) return null;
  g.reacted.push(...fresh);
  gain(s, g, fresh.length);
  learnTags(s, g.species, fresh);
  return { guest: gi, tags: fresh, hearts: fresh.length };
}

// ---------- おてがみ ----------
export function writeLetter(s, g, gift) {
  const sp = SPECIES[g.species], room = s.rooms[g.room], log = g.log || {};
  const body = [];
  const items = likedItems(room, g.species);
  const walls = [...WALLS[room.wall].tags, ...FLOORS[room.floor].tags].filter(t => sp.likes.includes(t));
  if (items.length) body.push(`${ITEMS[items[items.length - 1].id].name}が とっても すてきだった！`);
  else if (walls.length) body.push(WALLS[room.wall].tags.some(t => sp.likes.includes(t)) ? `${WALLS[room.wall].name}の かべが すきだよ。` : `${FLOORS[room.floor].name}が きもちよかった！`);
  else body.push(`こんどは ${TAGS[g.wish].name}${TAGS[g.wish].icon}の ある へやだと うれしいな。`);
  if (log.food === 'fav') body.push(`${FOODS.find(f => f.id === sp.fav).name}、ほっぺが おちそうなくらい おいしかった！`);
  else if (log.food === 'ok') body.push('ごはん ごちそうさまでした。');
  if (log.play?.fav) body.push(`${TOYS[log.play.toy].name}で あそんで たのしかった！`);
  else if (log.pet === 'fav') body.push(`${SPOTS[sp.spot]}を なでてもらって うれしかった。`);
  else if (log.bath) body.push(sp.bath === 'daisuki' ? 'おふろ さいこう だったよ！' : 'おふろ ちょっと がんばったよ。');
  else if (log.play) body.push('いっしょに あそべて たのしかった。');
  body.push(log.bed ? 'ベッドで ぐっすり ねむれたよ。' : 'ベッドが あると うれしいな。');
  return {
    species: g.species, day: s.day,
    lines: ['おせわがかりさんへ', ...body.slice(0, 3), 'おみやげを おいていくね。 また くるね！', `${sp.name}より`],
    gift, read: false,
  };
}

// ---------- よる → つぎの あさ ----------
function giveGift(s, species, rng) {
  const pool = SPECIES[species].gifts;
  // まだ もっていない かべがみ・ゆかを 先に。家具は すくない ものほど でやすい
  const newDeco = pool.filter(p => { const [k, id] = p.split(':'); return (k === 'wall' && !s.walls.includes(id)) || (k === 'floor' && !s.floors.includes(id)); });
  const items = pool.filter(p => !p.includes(':'));
  let chosen;
  if (newDeco.length && rng() < 0.4) chosen = newDeco[Math.floor(rng() * newDeco.length)];
  else {
    const weights = items.map(id => 1 / (1 + (s.owned[id] || 0) * 2));
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    chosen = items[items.length - 1];
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) { chosen = items[i]; break; } }
  }
  const [k, id] = chosen.includes(':') ? chosen.split(':') : ['item', chosen];
  if (k === 'wall') s.walls.push(id);
  else if (k === 'floor') s.floors.push(id);
  else s.owned[id] = (s.owned[id] || 0) + 1;
  return { kind: k, id };
}

export const nextRoomHearts = s => (s.rooms.length < MAX_ROOMS ? ROOM_HEARTS[s.rooms.length] : null);

export function endDay(s, rng = Math.random) {
  if (!allDone(s)) return null;
  const letters = s.today.guests.map(g => writeLetter(s, g, giveGift(s, g.species, rng)));
  s.letters.push(...letters);
  s.letters = s.letters.slice(-LETTER_KEEP);
  const unlocked = [];
  while (s.rooms.length < MAX_ROOMS && s.hearts >= ROOM_HEARTS[s.rooms.length]) {
    s.owned.bed = (s.owned.bed || 0) + 1;
    s.rooms.push(newRoom('cream', 'wood', [{ id: 'bed', x: 300, y: 470 }]));
    unlocked.push(s.rooms.length - 1);
  }
  s.today = null;
  s.day++;
  return { letters, unlocked };
}
