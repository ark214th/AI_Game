// ホテルの しくみ（画面や音とは切りはなした計算だけ。node --test で確かめられる）
import { SPECIES, SPECIES_IDS, ITEMS, WALLS, FLOORS, ROOM, ROOM_HEARTS, MAX_ROOMS, GUESTS_PER_DAY } from './data.mjs';

export const NEED_ORDER = ['food', 'bath', 'pet'];

const newRoom = (wall = 'cream', floor = 'wood', items = []) => ({ wall, floor, items });
const newZukan = () => ({ met: 0, fav: false, dislike: false, spot: false, bath: false, tags: [] });

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
    today: null,
    sound: true,
    tips: {},
  };
}

// 保存データを よみこむ（こわれていても あそべるように ととのえる）
export function normalize(raw) {
  const s = newSave();
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return s;
  const num = (v, d, min = 0) => (Number.isFinite(v) && v >= min ? Math.floor(v) : d);
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
        met: num(z.met, 0), fav: z.fav === true, dislike: z.dislike === true, spot: z.spot === true, bath: z.bath === true,
        tags: Array.isArray(z.tags) ? z.tags.filter(t => SPECIES[id].likes.includes(t)) : [],
      };
    }
  }
  s.sound = raw.sound !== false;
  s.tips = raw.tips && typeof raw.tips === 'object' ? { ...raw.tips } : {};
  if (raw.today && Array.isArray(raw.today.guests)) {
    const guests = raw.today.guests.filter(g => SPECIES[g?.species] && Number.isInteger(g.room) && g.room >= 0 && g.room < s.rooms.length
      && Array.isArray(g.needs) && g.needs.every(n => NEED_ORDER.includes(n)));
    if (guests.length) s.today = { guests: guests.map(g => ({ species: g.species, room: g.room, needs: [...g.needs], done: Math.min(num(g.done, 0), g.needs.length), hearts: num(g.hearts, 0), reacted: Array.isArray(g.reacted) ? [...g.reacted] : [] })) };
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

// ---------- 1にち ----------
function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function pickGuests(s, rng) {
  const ids = shuffle([...SPECIES_IDS], rng);
  const out = [];
  for (let i = 0; i < GUESTS_PER_DAY; i++) out.push(ids[i % ids.length]);
  return out;
}

// すきなものが おおい へやから じゅんに わりあてる
export function assignRooms(s, speciesList) {
  const free = new Set(s.rooms.map((_, i) => i));
  const result = new Array(speciesList.length).fill(-1);
  const left = new Set(speciesList.map((_, i) => i));
  while (left.size && free.size) {
    let best = null;
    for (const g of left) for (const r of free) {
      const sc = likedTags(s.rooms[r], speciesList[g]).length;
      if (!best || sc > best.sc) best = { g, r, sc };
    }
    result[best.g] = best.r; left.delete(best.g); free.delete(best.r);
  }
  return result;
}

// あさ：お客さんが くる。へやが すきなら ハートが もらえる
export function startDay(s, rng = Math.random) {
  const list = pickGuests(s, rng);
  const rooms = assignRooms(s, list);
  const events = [];
  s.today = { guests: [] };
  list.forEach((species, i) => {
    if (rooms[i] < 0) return;
    const g = { species, room: rooms[i], needs: shuffle([...NEED_ORDER], rng), done: 0, hearts: 0, reacted: [] };
    s.today.guests.push(g);
    s.zukan[species].met++;
    const liked = likedTags(s.rooms[g.room], species);
    if (liked.length) {
      g.reacted.push(...liked);
      gain(s, g, liked.length);
      learnTags(s, species, liked);
      events.push({ type: 'likeRoom', guest: s.today.guests.length - 1, tags: liked, hearts: liked.length });
    }
  });
  return events;
}

function gain(s, g, n) { s.hearts += n; g.hearts += n; }
function learnTags(s, species, tags) {
  const z = s.zukan[species];
  for (const t of tags) if (!z.tags.includes(t)) z.tags.push(t);
}

export const guestAt = (s, roomIdx) => s.today?.guests.findIndex(g => g.room === roomIdx) ?? -1;
export const needOf = g => (g && g.done < g.needs.length ? g.needs[g.done] : null);
export const isHappy = g => g.done >= g.needs.length;
export const allDone = s => !!s.today && s.today.guests.every(isHappy);

function finishNeed(s, g, hearts) {
  g.done++;
  gain(s, g, hearts);
}

// ごはん：すきな ものなら ハート2、ふつうは 1、にがてなら たべない（しっぱいには しない）
export function feed(s, gi, food) {
  const g = s.today.guests[gi], sp = SPECIES[g.species], z = s.zukan[g.species];
  if (needOf(g) !== 'food') return { result: 'notNow', hearts: 0 };
  if (food === sp.dislike) { const learned = !z.dislike; z.dislike = true; return { result: 'dislike', hearts: 0, learned }; }
  if (food === sp.fav) { const learned = !z.fav; z.fav = true; finishNeed(s, g, 2); return { result: 'fav', hearts: 2, learned }; }
  finishNeed(s, g, 1);
  return { result: 'ok', hearts: 1 };
}

// おふろ：おわったら よぶ。おふろ だいすきな子は ハート2
export function bathDone(s, gi) {
  const g = s.today.guests[gi], sp = SPECIES[g.species], z = s.zukan[g.species];
  if (needOf(g) !== 'bath') return { result: 'notNow', hearts: 0 };
  const learned = !z.bath; z.bath = true;
  const hearts = sp.bath === 'daisuki' ? 2 : 1;
  finishNeed(s, g, hearts);
  return { result: sp.bath, hearts, learned };
}

// なでる：どこを なでたか。すきな ところを おおく なでたら ハート2
export function petDone(s, gi, favShare) {
  const g = s.today.guests[gi];
  if (needOf(g) !== 'pet') return { result: 'notNow', hearts: 0 };
  const hearts = favShare >= 0.5 ? 2 : 1;
  finishNeed(s, g, hearts);
  return { result: hearts === 2 ? 'fav' : 'ok', hearts };
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

// ---------- よる → つぎの あさ ----------
function giveGift(s, species, rng) {
  const pool = SPECIES[species].gifts;
  // まだ もっていない かべがみ・ゆかを 先に。家具は すくない ものほど でやすい
  const newDeco = pool.filter(p => { const [k, id] = p.split(':'); return (k === 'wall' && !s.walls.includes(id)) || (k === 'floor' && !s.floors.includes(id)); });
  const items = pool.filter(p => !p.includes(':'));
  let pick;
  if (newDeco.length && rng() < 0.4) pick = newDeco[Math.floor(rng() * newDeco.length)];
  else {
    const weights = items.map(id => 1 / (1 + (s.owned[id] || 0) * 2));
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    pick = items[items.length - 1];
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) { pick = items[i]; break; } }
  }
  const [k, id] = pick.includes(':') ? pick.split(':') : ['item', pick];
  if (k === 'wall') s.walls.push(id);
  else if (k === 'floor') s.floors.push(id);
  else s.owned[id] = (s.owned[id] || 0) + 1;
  return { species, kind: k, id };
}

export const nextRoomHearts = s => (s.rooms.length < MAX_ROOMS ? ROOM_HEARTS[s.rooms.length] : null);

export function endDay(s, rng = Math.random) {
  if (!allDone(s)) return null;
  const gifts = s.today.guests.map(g => giveGift(s, g.species, rng));
  const unlocked = [];
  while (s.rooms.length < MAX_ROOMS && s.hearts >= ROOM_HEARTS[s.rooms.length]) {
    s.owned.bed = (s.owned.bed || 0) + 1;
    s.rooms.push(newRoom('cream', 'wood', [{ id: 'bed', x: 300, y: 470 }]));
    unlocked.push(s.rooms.length - 1);
  }
  s.today = null;
  s.day++;
  return { gifts, unlocked };
}
