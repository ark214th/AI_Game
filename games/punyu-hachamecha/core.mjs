// 計算（画面と切り離す）：しまと はしの うえの いどう・ともだちと すんでいる この じょうたい・
// あそび（かいがら・じゃんけん・かざりつけ・ほし・おいかけっこ・えがおを とどける）・はなまる・もや・あんない・ほぞん
import {
  ISLANDS, BRIDGES, FOGS, TREES, ROCKS, POND, CAKE, PAD, SEA, EDGE, FRIENDS, MAIN_IDS, RESIDENTS,
  SHELLS, SHELL_NEED, shellPos, BEACH_SPOT, HANDS, BEATS, JANKEN_WINS, TELL_MS, JANKEN_SPOT, SIDE_SPOT,
  TOPPINGS, DECO_MIN, DECO_MAX, STAR_SPOTS, STAR_RUNNER, STAR_RUN_TO, STAR_NEED, CHASE_NEED, CHASE_SPEED, CHEER_NEED,
  SHARDS, SPEED, PLAYER_START, TALK_R, TOUCH_R,
  HOUSE, DAILY_RES, OUTFITS, START_OWNED, DEFAULT_OUTFIT, PRICE, DECOS, SKY_SHAPES,
} from './data.mjs';

export const SAVE_KEY = 'punyu-hachamecha-v2';
export const friendById = (id) => FRIENDS.find((f) => f.id === id);
export const resById = (id) => RESIDENTS.find((r) => r.id === id);
const islandById = (id) => ISLANDS.find((i) => i.id === id);

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// あたらしい ほぞんデータ
export function newSave() {
  const friends = {}, res = {};
  // ever＝いちどでも えがおに なった（えがおの かず・はなは これで かぞえる）。lv＝じょうずに なった ぶん
  for (const f of FRIENDS) friends[f.id] = { state: 'sad', best: 0, ever: false, lv: 0 };
  for (const r of RESIDENTS) res[r.id] = { state: r.arrive ? 'away' : 'sad', got: [], ever: false };
  return {
    version: 2,
    player: { ...PLAYER_START },
    dir: { x: 0, z: 0 },
    facing: Math.PI,
    time: 0,
    friends,            // state: 'sad'（こまった）| 'play'（あそんでいる）| 'happy'（えがお）
    res,                // すんでいる こ。state は おなじ。got は あつめた もの
    party: [],          // ぷにゅに ついてくる じゅんばん
    shells: null, janken: null, deco: null, stars: null, chase: null, cheer: null,   // あそびの とちゅう
    cleared: [],        // はれた もや
    stickers: [],
    letters: [],
    shards: [],
    seen: [],           // いちど みた せつめい
    ending: false,
    day: 1, phase: 'day', today: [],          // まいにち：phase は 'day' | 'evening'
    hearts: 0, owned: START_OWNED.slice(), outfit: { ...DEFAULT_OUTFIT }, decos: [],
    album: { sky: [], jelly: [] },
    sound: true,
  };
}

export const mainHappy = (s) => MAIN_IDS.filter((id) => s.friends[id].ever).length;
export const smiles = (s) => FRIENDS.filter((f) => s.friends[f.id].ever).length + RESIDENTS.filter((r) => s.res[r.id].ever).length;
export const fogCleared = (s, id) => s.cleared.includes(id);
// がめんを とめて あそぶ もの（この あいだは あるかない）
export const modal = (s) => !!(s.janken || s.deco || s.cheer || s.stars?.phase === 'aim');

function checkFogs(s) {
  const cleared = [];
  for (const fog of FOGS) {
    const ok = fog.need === 'main' ? mainHappy(s) >= MAIN_IDS.length : smiles(s) >= fog.need;
    if (ok && !s.cleared.includes(fog.id)) { s.cleared.push(fog.id); cleared.push(fog.id); }
  }
  return cleared;
}

// ---- あるける ばしょ ----
const OBSTACLES = [
  ...TREES.map((t) => ({ x: t.x, z: t.z, r: (t.kind === 'lamp' ? 0.45 : t.kind === 'candy' ? 0.5 : 0.75) * t.s })),
  ...ROCKS.map((r) => ({ x: r.x, z: r.z, r: r.r * 0.95 })),
  { x: POND.x, z: POND.z, r: POND.r - 0.5 },
  { x: CAKE.x, z: CAKE.z, r: CAKE.r },
  { x: PAD.x, z: PAD.z, r: PAD.r },
  { x: SEA.x, z: SEA.z, r: SEA.deep },   // ふかい ところ へは いけない（あさせは あるける）
  { x: HOUSE.x, z: HOUSE.z, r: HOUSE.r },
];
const PLAYER_BODY = 0.8;

const open = (s, o) => !o.fog || fogCleared(s, o.fog);
export const bridgeOpen = (s, b) => open(s, b);

// はしの うえか
function onBridge(b, p, margin = 0) {
  const dx = b.b.x - b.a.x, dz = b.b.z - b.a.z, len = Math.hypot(dx, dz);
  const ux = dx / len, uz = dz / len;
  const along = (p.x - b.a.x) * ux + (p.z - b.a.z) * uz;
  const side = Math.abs((p.x - b.a.x) * -uz + (p.z - b.a.z) * ux);
  return along >= -margin && along <= len + margin && side <= b.hw - 0.3;
}
const inIsland = (i, p) => dist(i, p) <= i.r - EDGE;

export function walkable(s, p) {
  if (ISLANDS.some((i) => open(s, i) && inIsland(i, p))) return true;
  return BRIDGES.some((b) => open(s, b) && onBridge(b, p, 0.6));
}

// いま いる しま（はしの うえ なら null）
export function islandAt(p) {
  const i = ISLANDS.find((x) => inIsland(x, p));
  return i ? i.id : null;
}

// ---- ばしょを きめる（かざりを おく ところ・ひっこして くる かずうさの おうち） ----
// しまの ふちに そって こうほを ならべ、き・いわ・ともだち・はし から はなれた ところ だけ のこす
const TAKEN = [
  ...OBSTACLES.map((o) => ({ x: o.x, z: o.z, r: o.r + 1.6 })),
  ...FRIENDS.map((f) => ({ ...f.home, r: 4.5 })), ...RESIDENTS.filter((r) => !r.arrive).flatMap((r) => [{ ...r.home, r: 3.5 }, ...(r.spots || []).map((p) => ({ ...p, r: 2.2 }))]),
  ...BRIDGES.flatMap((b) => [{ ...b.a, r: 5.5 }, { ...b.b, r: 5.5 }]),
  ...SHARDS.map((p) => ({ ...p, r: 2 })), ...STAR_SPOTS.map((p) => ({ ...p, r: 2.2 })), { ...STAR_RUN_TO, r: 2.2 }, { ...PLAYER_START, r: 4 },
  ...SHELLS.map((sh) => ({ ...shellPos(sh), r: 2.2 })), { x: SEA.x, z: SEA.z, r: SEA.mid + SEA.amp + 1.5 },
];
function ringSpots(isl, inset, count, gap) {
  const out = [];
  for (let k = 0; k < 36 && out.length < count; k++) {
    const a = ((k * 7) % 36) / 36 * Math.PI * 2 + isl.x * 0.01;      // とびとびの かくど（かたよらない ように）
    const p = { x: Math.round((isl.x + Math.cos(a) * (isl.r - inset)) * 10) / 10, z: Math.round((isl.z + Math.sin(a) * (isl.r - inset)) * 10) / 10 };
    if (TAKEN.some((t) => dist(t, p) < t.r + gap)) continue;
    out.push(p); TAKEN.push({ ...p, r: gap + 1.2 });
  }
  return out;
}
// かずうさの おうち（さきに きめる）→ かざりの ばしょ（しまごとに 3つ、じゅんばんに しまを まわる）
for (const r of RESIDENTS) if (r.arrive) { const p = ringSpots(islandById(r.island), 7.5, 1, 1.2)[0]; r.home.x = p.x; r.home.z = p.z; }
export const CASTLE_SPOT = ringSpots(islandById('moya'), 5.5, 1, 2)[0];
const perIsland = ISLANDS.map((i) => ringSpots(i, 4.2, 4, 1.6));
export const DECO_SPOTS = [0, 1, 2, 3].flatMap((k) => perIsland.map((l) => l[k]).filter(Boolean));

// ---- いどう ----
// x, z は スティックの かたむき（ながさ 0〜1）。ながさが はやさに なる
export function setDir(s, x, z) {
  const len = Math.hypot(x, z);
  if (len > 0.12) {
    const k = Math.min(1, len) / len;
    s.dir = { x: x * k, z: z * k };
    s.facing = Math.atan2(x, z);
  } else s.dir = { x: 0, z: 0 };
}

function pushOut(p, s) {
  // おいた かざりも とおれない
  const all = s && s.decos.length ? OBSTACLES.concat(s.decos.map((_, i) => ({ x: DECO_SPOTS[i].x, z: DECO_SPOTS[i].z, r: 1.4 }))) : OBSTACLES;
  for (const o of all) {
    const d = dist(o, p), min = o.r + PLAYER_BODY;
    if (d < min && d > 0.0001) { p.x = o.x + ((p.x - o.x) / d) * min; p.z = o.z + ((p.z - o.z) / d) * min; }
  }
  return p;
}

export function stepPlayer(s, dt) {
  s.time += dt;
  if (modal(s) || (s.dir.x === 0 && s.dir.z === 0)) return false;
  const p = s.player;
  const want = pushOut({ x: p.x + s.dir.x * SPEED * dt, z: p.z + s.dir.z * SPEED * dt }, s);
  // そのまま → よこだけ → たてだけ → しまの ふちに そって すべる
  const tries = [want, pushOut({ x: want.x, z: p.z }, s), pushOut({ x: p.x, z: want.z }, s)];
  const home = ISLANDS.find((i) => inIsland(i, p));
  if (home) {
    const d = dist(home, want), max = home.r - EDGE - 0.01;
    if (d > max) tries.push(pushOut({ x: home.x + ((want.x - home.x) / d) * max, z: home.z + ((want.z - home.z) / d) * max }, s));
  }
  // まっすぐ ぶつかって とまった ときは、ななめに よけて すすむ（き や いわを まわりこむ）
  for (const ang of [1.0, -1.0]) {
    const c = Math.cos(ang), sn = Math.sin(ang), k = SPEED * dt;
    tries.push(pushOut({ x: p.x + (s.dir.x * c - s.dir.z * sn) * k, z: p.z + (s.dir.x * sn + s.dir.z * c) * k }, s));
  }
  for (const t of tries) {
    if (walkable(s, t) && Math.hypot(t.x - p.x, t.z - p.z) > SPEED * dt * 0.2) { p.x = t.x; p.z = t.z; return true; }
  }
  return false;
}

// ともだちの そばの、あるける ばしょ
function spotNear(s, home, first) {
  for (const o of [first, { x: -first.x, z: first.z }, { x: 0, z: 3.4 }, { x: 0, z: -3.4 }]) {
    const p = { x: home.x + o.x, z: home.z + o.z };
    if (walkable(s, p) && !OBSTACLES.some((ob) => dist(ob, p) < ob.r + PLAYER_BODY)) return p;
  }
  return null;
}

// ---- なみ ----
export const waveR = (t) => SEA.mid + SEA.amp * Math.sin((t / SEA.period) * Math.PI * 2);
export const shellShown = (sh, t) => waveR(t) < sh.d;

// ---- はなしかける ----
// ちかくで できる こと：{ kind: 'friend' | 'res' | 'pad', id }
export function nearAction(s) {
  if (modal(s)) return null;
  if (s.stars?.phase === 'shoot' && dist(s.player, PAD) < TALK_R) return { kind: 'pad', id: 'kumokumo' };
  if (s.phase === 'evening' && dist(s.player, HOUSE) < TALK_R + 0.6) return { kind: 'bed', id: 'house' };
  let best = null;
  const see = (kind, id, home) => {
    const d = dist(s.player, home);
    if (d < TALK_R && walkable(s, home) && (!best || d < best.d)) best = { kind, id, d };
  };
  for (const f of FRIENDS) if (s.friends[f.id].state === 'sad') see('friend', f.id, f.home);
  for (const r of RESIDENTS) if (s.res[r.id].state === 'sad') see('res', r.id, r.home);
  return best ? { kind: best.kind, id: best.id } : null;
}
export const nearTalkable = (s) => { const a = nearAction(s); return a && a.kind === 'friend' ? a.id : null; };

// ともだちに はなしかけて、あそびを はじめる
export function talk(s, id, rng = Math.random) {
  const f = friendById(id);
  if (!f || s.friends[id].state !== 'sad' || modal(s)) return null;
  if (dist(s.player, f.home) >= TALK_R || !walkable(s, f.home)) return null;
  return beginPlay(s, id, rng);
}

function beginPlay(s, id, rng) {
  const f = friendById(id);
  if (s.friends[id].state === 'sad') s.friends[id].state = 'play';
  const stand = (o) => { const p = spotNear(s, f.home, o); if (p) s.player = p; s.dir = { x: 0, z: 0 }; };
  if (f.play === 'shells') {
    s.shells = { got: [] };
    if (!s.party.includes(id)) s.party.push(id);   // ちゃぷは いっしょに さがしに くる
  } else if (f.play === 'janken') {
    stand(JANKEN_SPOT);
    s.janken = { friend: id, wins: 0, losses: 0, rounds: 0, opp: null, lv: s.friends[id].lv };
    jankenReady(s, rng);
  } else if (f.play === 'deco') {
    stand(SIDE_SPOT);
    const pool = TOPPINGS.slice(), order = [];
    while (order.length < 3) order.push(pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0]);
    s.deco = { order, put: [] };
  } else if (f.play === 'stars') {
    s.stars = { phase: 'collect', got: [], ran: false, spots: STAR_SPOTS.map((p) => ({ ...p })), shot: 0, good: 0 };
  } else if (f.play === 'chase') {
    s.chase = { x: f.home.x, z: f.home.z, caught: 0, time: 0, tired: 0, spin: 1, dash: null, lv: s.friends.kaze.lv };
  } else if (f.play === 'cheer') {
    s.cheer = { n: 0 };
  }
  return { friend: id, play: f.play };
}

// えがおに なった あと、もういちど あそぶ（はなまるを ふやせる）。その この しまへ とぶ
export function replay(s, id, rng = Math.random) {
  const f = friendById(id);
  if (!f || !MAIN_IDS.includes(id) || !s.friends[id].ever) return null;
  if (modal(s) || s.shells || s.stars || s.chase) return null;
  if (f.play !== 'shells') { const p = spotNear(s, f.home, SIDE_SPOT); if (p) s.player = p; }
  return beginPlay(s, id, rng);
}

function complete(s, id, flowers) {
  const fr = s.friends[id];
  const first = !fr.ever;
  fr.state = 'happy'; fr.ever = true;
  const better = flowers > fr.best;
  fr.best = Math.max(fr.best, flowers);
  // はなまる 3つを とった あそびは、つぎから すこし むずかしく なる
  if (!first && flowers >= 3 && id !== 'moya') fr.lv = Math.min(3, fr.lv + 1);
  if (!s.party.includes(id)) s.party.push(id);
  if (!s.stickers.includes(id)) s.stickers.push(id);
  if (!s.letters.includes(id)) s.letters.push(id);
  // この こと いっしょに えがおに なる こ（ごちゃん ← いたずらかぜ）
  const also = [];
  for (const r of RESIDENTS) {
    if (r.with === id && !s.res[r.id].ever) { s.res[r.id].state = 'happy'; s.res[r.id].ever = true; s.stickers.push(r.id); also.push(r.id); }
  }
  const hearts = id === 'moya' ? 5 : flowers;
  s.hearts += hearts;
  if (id === 'moya') s.ending = true;
  return { done: true, friend: id, flowers, best: fr.best, first, better, also, hearts, cleared: checkFogs(s), ending: id === 'moya', ...dayCheck(s) };
}

// ---- まいにち ----
// きょうの おねがいが ぜんぶ おわったら ゆうがた（1にちめは エンディングの あと）
function dayCheck(s) {
  if (s.phase !== 'day' || !s.ending) return {};
  const left = s.today.some((t) => (t.kind === 'friend' ? s.friends[t.id].state : s.res[t.id].state) !== 'happy');
  if (left) return {};
  s.phase = 'evening';
  const bonus = s.day > 1 ? 3 : 0; s.hearts += bonus;
  return { evening: true, bonus };
}
export const bunniesHome = (s) => RESIDENTS.filter((r) => r.kind === 'bunny' && s.res[r.id].ever).length;
export const castleBuilt = (s) => bunniesHome(s) >= RESIDENTS.filter((r) => r.kind === 'bunny').length;
// おうちで ねむる → つぎの ひ。ともだち ふたり と すんでいる こ ひとりが「あそぼう」と まっている。かずうさが ひとり ひっこして くる
export function sleep(s, rng = Math.random) {
  if (s.phase !== 'evening') return null;
  s.day += 1; s.phase = 'day'; s.today = [];
  const k = s.day - 2;
  for (const id of [MAIN_IDS[(k * 2) % MAIN_IDS.length], MAIN_IDS[(k * 2 + 1) % MAIN_IDS.length]]) {
    s.friends[id].state = 'sad'; s.party = s.party.filter((x) => x !== id); s.today.push({ kind: 'friend', id });
  }
  const rid = DAILY_RES[k % DAILY_RES.length], rd = resById(rid);
  s.res[rid] = { ...s.res[rid], state: 'sad', got: [], spots: Array.from({ length: rd.spots.length }, () => randomSpot(s, rd.island, rng)) };
  s.today.push({ kind: 'res', id: rid });
  const comer = RESIDENTS.find((r) => r.arrive && s.res[r.id].state === 'away');
  if (comer) {
    s.res[comer.id] = { state: 'sad', got: [], ever: false, spots: Array.from({ length: comer.find }, () => randomSpot(s, comer.island, rng)) };
    s.today.push({ kind: 'res', id: comer.id });
  }
  s.player = { ...PLAYER_START };
  return { day: s.day, today: s.today, comer: comer ? comer.id : null };
}
// しまの うえの、なにも ない ばしょ
function randomSpot(s, islandId, rng) {
  const isl = islandById(islandId);
  for (let i = 0; i < 80; i++) {
    const a = rng() * Math.PI * 2, r = 2 + rng() * (isl.r - EDGE - 3.5);
    const p = { x: Math.round((isl.x + Math.cos(a) * r) * 10) / 10, z: Math.round((isl.z + Math.sin(a) * r) * 10) / 10 };
    const q = pushOut({ ...p }, s);
    if (q.x !== p.x || q.z !== p.z) continue;
    if (FRIENDS.some((f) => dist(f.home, p) < 3) || RESIDENTS.some((x) => dist(x.home, p) < 3)) continue;
    if (dist(p, SEA) < SEA.mid + SEA.amp + 1) continue;
    return p;
  }
  return { x: isl.x, z: isl.z + 2 };
}
// おねがいの ものが ある ばしょ（まいにちの おねがいは まいかい ちがう ばしょ）
export const spotsOf = (s, r) => s.res[r.id].spots || r.spots || [];

// ---- おみせ ----
export const priceOf = (id) => { const o = OUTFITS.find((x) => x.id === id); return o ? PRICE[o.slot] : DECOS.some((x) => x.id === id) ? PRICE.deco : 0; };
// きせかえを かう／きる。かざりを かうと、つぎの あいている ばしょに おかれる
export function buy(s, id) {
  const o = OUTFITS.find((x) => x.id === id), dc = DECOS.find((x) => x.id === id);
  if (o) {
    if (!s.owned.includes(id)) { if (s.hearts < PRICE[o.slot]) return { ok: false, short: true }; s.hearts -= PRICE[o.slot]; s.owned.push(id); }
    s.outfit[o.slot] = id;
    return { ok: true, worn: true };
  }
  if (dc) {
    if (s.decos.includes(id)) return { ok: false };
    if (s.decos.length >= DECO_SPOTS.length) return { ok: false, full: true };
    if (s.hearts < PRICE.deco) return { ok: false, short: true };
    s.hearts -= PRICE.deco; s.decos.push(id);
    const spot = DECO_SPOTS[s.decos.length - 1];
    // ぷにゅが その ばしょに いたら、よこへ よける
    if (dist(s.player, spot) < 2.4) s.player = pushOut({ x: s.player.x + 0.1, z: s.player.z + 2.5 }, s);
    return { ok: true, placed: s.decos.length - 1, spot };
  }
  return { ok: false };
}

// ---- すんでいる こ ----
export function talkRes(s, id) {
  const r = resById(id), st = s.res[id];
  if (!r || st.state !== 'sad' || modal(s) || dist(s.player, r.home) >= TALK_R) return null;
  const spots = spotsOf(s, r);
  if (r.with) return { res: id, quest: false };      // ともだちの あそびが おわると えがおに なる
  if (!spots.length) return { res: id, quest: false, ...resDone(s, r) };   // さがす ものが ない こ（いちちゃん）
  st.state = 'play';
  return { res: id, quest: true };
}
function resDone(s, r) {
  const st = s.res[r.id], first = !st.ever;
  st.state = 'happy'; st.ever = true;
  if (!r.arrive && !s.stickers.includes(r.id)) s.stickers.push(r.id);
  const hearts = r.arrive ? 3 : 2; s.hearts += hearts;
  const castle = !!r.arrive && first && castleBuilt(s);
  return { done: true, first, hearts, castle, cleared: checkFogs(s), ...dayCheck(s) };
}
// かずうさの ブロックの かず
export function blocksOf(s, id) {
  const r = resById(id), st = s.res[id];
  if (!r || r.kind !== 'bunny') return 0;
  const total = r.n || r.base + (r.spots ? r.spots.length : r.need);
  if (st.state === 'happy') return total;
  if (r.with === 'kaze') return r.base + (s.chase ? s.chase.caught : 0);
  return total - spotsOf(s, r).length + st.got.length;
}
// おねがいの ものに ふれると あつまる。ぜんぶ あつまると えがお
export function touchItems(s) {
  for (const r of RESIDENTS) {
    const st = s.res[r.id], spots = spotsOf(s, r);
    if (st.state !== 'play') continue;
    for (let i = 0; i < spots.length; i++) {
      if (st.got.includes(i) || dist(s.player, spots[i]) > TOUCH_R) continue;
      st.got.push(i);
      const out = { res: r.id, index: i, got: st.got.length, need: spots.length, done: false, cleared: [] };
      return st.got.length >= spots.length ? { ...out, ...resDone(s, r) } : out;
    }
  }
  return null;
}

// ---- かいがら ----
export function touchShells(s) {
  if (!s.shells) return null;
  for (let i = 0; i < SHELLS.length; i++) {
    if (s.shells.got.includes(i) || !shellShown(SHELLS[i], s.time)) continue;
    if (dist(s.player, shellPos(SHELLS[i])) > TOUCH_R) continue;
    s.shells.got.push(i);
    const got = s.shells.got.length;
    if (got >= SHELL_NEED) {
      const rainbow = s.shells.got.filter((j) => SHELLS[j].rainbow).length;
      s.shells = null;
      return { index: i, rainbow: !!SHELLS[i].rainbow, got, ...complete(s, 'chapu', 1 + Math.min(2, rainbow)) };
    }
    return { index: i, rainbow: !!SHELLS[i].rainbow, got, done: false };
  }
  return null;
}

// ---- じゃんけん ----
export const tellMs = (round, lv = 0) => TELL_MS[Math.min(round + lv, TELL_MS.length - 1)];
export function jankenReady(s, rng = Math.random) {
  if (!s.janken) return null;
  s.janken.opp = HANDS[Math.floor(rng() * 3) % 3];
  return s.janken.opp;
}
export function jankenPlay(s, hand, rng = Math.random) {
  const j = s.janken;
  if (!j || !j.opp || !HANDS.includes(hand)) return null;
  const opp = j.opp;
  const result = hand === opp ? 'draw' : BEATS[hand] === opp ? 'win' : 'lose';
  j.rounds += 1;
  if (result === 'win') j.wins += 1;
  if (result === 'lose') j.losses += 1;
  const out = { you: hand, opp, result, wins: j.wins, losses: j.losses, rounds: j.rounds };
  if (j.wins >= JANKEN_WINS) {
    const flowers = j.losses === 0 ? 3 : j.losses <= 2 ? 2 : 1;
    s.janken = null;
    return { ...out, ...complete(s, j.friend, flowers) };
  }
  jankenReady(s, rng);
  return { ...out, done: false };
}

// とちゅうで やめる（しっぱい では ない。また いつでも できる）
export function quit(s) {
  let id = null;
  if (s.janken) { id = s.janken.friend; s.janken = null; }
  else if (s.deco) { id = 'jelly'; s.deco = null; }
  else if (s.cheer) { id = 'moya'; s.cheer = null; }
  else if (s.stars?.phase === 'aim') { s.stars.phase = 'shoot'; return true; }
  if (!id) return false;
  if (s.friends[id].state === 'play') s.friends[id].state = 'sad';
  return true;
}

// ---- かざりつけ ----
export function decoPut(s, type) {
  if (!s.deco || !TOPPINGS.includes(type) || s.deco.put.length >= DECO_MAX) return false;
  s.deco.put.push(type); return true;
}
export function decoUndo(s) { return !!(s.deco && s.deco.put.pop()); }
// ちゅうもんと おなじ ものが いくつ のったか
export function decoMatch(order, put) {
  const rest = put.slice(); let n = 0;
  for (const o of order) { const i = rest.indexOf(o); if (i >= 0) { rest.splice(i, 1); n += 1; } }
  return n;
}
export function decoDone(s) {
  if (!s.deco || s.deco.put.length < DECO_MIN) return null;
  const m = decoMatch(s.deco.order, s.deco.put);
  s.friends.jelly.deco = s.deco.put.slice();
  s.album.jelly = [s.deco.put.slice(), ...s.album.jelly].slice(0, 8);
  s.deco = null;
  return complete(s, 'jelly', m >= 3 ? 3 : m === 2 ? 2 : 1);
}

// ---- ほし ----
// しまに おちた ほしに ふれて ひろう。1つは いちど だけ にげる
export function touchStars(s) {
  const st = s.stars;
  if (!st || st.phase !== 'collect') return null;
  for (let i = 0; i < st.spots.length; i++) {
    if (st.got.includes(i) || dist(s.player, st.spots[i]) > TOUCH_R + 0.3) continue;
    if (i === STAR_RUNNER && !st.ran) { st.ran = true; st.spots[i] = { ...STAR_RUN_TO }; return { index: i, ran: true }; }
    st.got.push(i);
    if (st.got.length >= STAR_NEED) st.phase = 'shoot';
    return { index: i, got: st.got.length, ready: st.phase === 'shoot' };
  }
  return null;
}
// ほしの だいで とばしはじめる
export function starAim(s) {
  if (s.stars?.phase !== 'shoot' || dist(s.player, PAD) >= TALK_R) return false;
  s.stars.phase = 'aim'; s.dir = { x: 0, z: 0 }; return true;
}
// わっかの おおきさ（0〜1）。おおきい ときに おすと「ぴったり」
export const ringSize = (t) => 0.5 + 0.5 * Math.sin(t * 2.4 - Math.PI / 2);
export const ringGood = (t) => ringSize(t) > 0.7;
export function shootStar(s, good) {
  const st = s.stars;
  if (!st || st.phase !== 'aim') return null;
  st.shot += 1; if (good) st.good += 1;
  const out = { shot: st.shot, good: !!good, goods: st.good };
  if (st.shot >= STAR_NEED) {
    s.stars = null;
    // とばす たびに ちがう せいざに なる
    const fr = s.friends.kumokumo; fr.sky = fr.sky === undefined ? 0 : (fr.sky + 1) % SKY_SHAPES.length;
    if (!s.album.sky.includes(fr.sky)) s.album.sky.push(fr.sky);
    return { ...out, ...complete(s, 'kumokumo', st.good >= 4 ? 3 : st.good >= 2 ? 2 : 1) };
  }
  return { ...out, done: false };
}

// ---- おいかけっこ ----
// いたずらかぜは ぷにゅから にげる。タッチすると とおくへ ぴゅーんと とんで、また にげる
export function stepChase(s, dt) {
  const c = s.chase;
  if (!c) return null;
  const isl = islandById('hoshi'), p = s.player;
  if (islandAt(p) !== 'hoshi') return null;
  c.time += dt;
  if (c.dash) {
    const d = dist(c, c.dash), step = 26 * dt;
    if (d <= step) { c.x = c.dash.x; c.z = c.dash.z; c.dash = null; } else { c.x += ((c.dash.x - c.x) / d) * step; c.z += ((c.dash.z - c.z) / d) * step; }
    return null;
  }
  const d = dist(p, c);
  if (d < 1.9) {
    c.caught += 1; c.tired = 0; c.spin *= -1;
    if (c.caught >= CHASE_NEED) {
      const t = c.time; s.chase = null;
      return { caught: CHASE_NEED, ...complete(s, 'kaze', t < 50 ? 3 : t < 90 ? 2 : 1) };
    }
    // しまの はんたいがわへ とぶ
    const ox = isl.x - p.x, oz = isl.z - p.z, ol = Math.hypot(ox, oz) || 1, far = isl.r - 5;
    c.dash = ol > 3 ? { x: isl.x + (ox / ol) * far, z: isl.z + (oz / ol) * far } : { x: isl.x + far * c.spin, z: isl.z };
    return { caught: c.caught, done: false };
  }
  if (d < 13) {
    c.tired += dt;
    let ax = (c.x - p.x) / (d || 1), az = (c.z - p.z) / (d || 1);
    let vx = ax + -az * 0.6 * c.spin, vz = az + ax * 0.6 * c.spin;
    const cx = isl.x - c.x, cz = isl.z - c.z, r = Math.hypot(cx, cz), lim = isl.r - 5;
    if (r > lim) { const k = (r - lim) / 1.5; vx += (cx / r) * k; vz += (cz / r) * k; }
    const vl = Math.hypot(vx, vz) || 1;
    const sp = (CHASE_SPEED[Math.min(c.caught, CHASE_SPEED.length - 1)] + (c.lv || 0) * 0.25) * (c.tired > 9 ? 0.7 : 1);   // ながく にげると つかれて おそく なる
    c.x += (vx / vl) * sp * dt; c.z += (vz / vl) * sp * dt;
    const r2 = dist(isl, c), max = isl.r - 2.4;
    if (r2 > max) { c.x = isl.x + ((c.x - isl.x) / r2) * max; c.z = isl.z + ((c.z - isl.z) / r2) * max; }
  }
  return null;
}

// ---- えがおを とどける（でかもやもや） ----
export function cheer(s) {
  if (!s.cheer) return null;
  s.cheer.n += 1;
  if (s.cheer.n >= CHEER_NEED) { s.cheer = null; return { n: CHEER_NEED, ...complete(s, 'moya', 3) }; }
  return { n: s.cheer.n, done: false };
}

// ---- かけら ----
export function touchShards(s) {
  for (let i = 0; i < SHARDS.length; i++) {
    if (!s.shards.includes(i) && dist(s.player, SHARDS[i]) < TOUCH_R) { s.shards.push(i); s.hearts += 1; return i; }
  }
  return -1;
}

// ---- あんない（ちょうちょ） ----
// しまから しまへの みち（ひらいている はし だけ）
function islandPath(s, from, to) {
  const seen = new Set([from]), queue = [[from]];
  while (queue.length) {
    const path = queue.shift(), cur = path[path.length - 1];
    if (cur === to) return path;
    for (const b of BRIDGES) {
      if (!open(s, b)) continue;
      const next = b.from === cur ? b.to : b.to === cur ? b.from : null;
      if (next && !seen.has(next)) { seen.add(next); queue.push([...path, next]); }
    }
  }
  return null;
}
const islandOf = (p) => islandAt(p) || ISLANDS.reduce((a, b) => (dist(a, p) - a.r < dist(b, p) - b.r ? a : b)).id;

// いま めざすと よい ばしょ。なにも なければ null
export function guideGoal(s) {
  if (modal(s)) return null;
  if (s.shells) return { ...BEACH_SPOT, kind: 'beach' };
  if (s.phase === 'evening' && !s.chase && !s.stars) return { x: HOUSE.x, z: HOUSE.z + 2.6, kind: 'bed' };
  if (s.chase) return { x: s.chase.x, z: s.chase.z, kind: 'kaze' };
  if (s.stars?.phase === 'shoot') return { x: PAD.x, z: PAD.z, kind: 'pad' };
  const near = (list) => list.reduce((a, b) => (!a || dist(s.player, b) < dist(s.player, a) ? b : a), null);
  if (s.stars) return near(s.stars.spots.filter((_, i) => !s.stars.got.includes(i)).map((p) => ({ ...p, kind: 'star' })));
  const items = [];
  for (const r of RESIDENTS) {
    if (s.res[r.id].state === 'play') spotsOf(s, r).forEach((p, i) => { if (!s.res[r.id].got.includes(i)) items.push({ ...p, kind: 'item', res: r.id }); });
  }
  if (items.length) return near(items);
  // いける ところに いる、こまっている こ
  const from = islandOf(s.player), sad = [];
  for (const f of FRIENDS) if (s.friends[f.id].state === 'sad' && islandPath(s, from, f.island)) sad.push({ ...f.home, kind: 'friend', id: f.id });
  for (const r of RESIDENTS) if (s.res[r.id].state === 'sad' && !r.with && islandPath(s, from, r.island)) sad.push({ ...r.home, kind: 'res', id: r.id });
  return near(sad);
}

// はしの はしっこ から、しまの なかへ すこし はいった ところ（はしの うえで とまらない ように）
function bridgeEnd(b, toB) {
  const dx = b.b.x - b.a.x, dz = b.b.z - b.a.z, len = Math.hypot(dx, dz), k = (toB ? 1 : -1) * 2.5 / len;
  const e = toB ? b.b : b.a;
  return { x: e.x + dx * k, z: e.z + dz * k, kind: 'bridge' };
}

// めざす ばしょへ いく ための、つぎの とちゅうの ばしょ（はしを わたる ときは はしの いりぐち・でぐち）
export function guideStep(s) {
  const goal = guideGoal(s);
  if (!goal) return null;
  const here = islandAt(s.player), there = islandOf(goal);
  if (here === there) return goal;
  if (!here) {
    // はしの うえ：めざす しまに ちかい ほうの はしっこへ
    const b = BRIDGES.find((x) => open(s, x) && onBridge(x, s.player, 0.7));
    if (!b) return goal;
    const path = islandPath(s, b.to, there), back = islandPath(s, b.from, there);
    return bridgeEnd(b, !!path && (!back || path.length <= back.length));
  }
  const path = islandPath(s, here, there);
  if (!path || path.length < 2) return goal;
  const b = BRIDGES.find((x) => open(s, x) && ((x.from === here && x.to === path[1]) || (x.to === here && x.from === path[1])));
  const near = b.from === here ? b.a : b.b;
  return dist(s.player, near) > 2 ? { ...near, kind: 'bridge' } : bridgeEnd(b, b.from === here);
}

// ---- ほぞん ----
export function serialize(s) {
  return JSON.stringify({
    version: 2,
    player: s.player, friends: s.friends, res: s.res, party: s.party, shells: s.shells,
    shards: s.shards, seen: s.seen, sound: s.sound,
    day: s.day, phase: s.phase, today: s.today, hearts: s.hearts, owned: s.owned, outfit: s.outfit, decos: s.decos, album: s.album,
  });
}

export function deserialize(json) {
  try {
    const d = typeof json === 'string' ? JSON.parse(json) : json;
    if (!d || d.version !== 2 || !d.friends) return null;
    const s = newSave();
    const pt = (p) => p && Number.isFinite(+p.x) && Number.isFinite(+p.z) ? { x: +p.x, z: +p.z } : null;
    for (const f of FRIENDS) {
      const src = d.friends[f.id] || {}, fr = s.friends[f.id];
      // まえの ほぞんデータには ever が ない（happy なら いちど えがおに なっている）
      fr.ever = !!src.ever || src.state === 'happy';
      // あそびの とちゅうは つづけない（かいがら だけ つづける）
      fr.state = src.state === 'happy' ? 'happy' : src.state === 'play' && f.play === 'shells' ? 'play' : 'sad';
      fr.best = fr.ever ? clamp(src.best | 0, 1, 3) : 0;
      fr.lv = fr.ever ? clamp(src.lv | 0, 0, 3) : 0;
      if (f.id === 'jelly' && Array.isArray(src.deco)) fr.deco = src.deco.filter((t) => TOPPINGS.includes(t)).slice(0, DECO_MAX);
      if (f.id === 'kumokumo' && Number.isInteger(src.sky)) fr.sky = clamp(src.sky, 0, SKY_SHAPES.length - 1);
    }
    // でかもやもやは 5にんが えがおに なってから
    if (mainHappy(s) < MAIN_IDS.length) { s.friends.moya.state = 'sad'; s.friends.moya.ever = false; }
    s.ending = s.friends.moya.ever;
    if (s.ending) s.friends.moya.state = 'happy';
    for (const r of RESIDENTS) {
      const src = d.res?.[r.id] || {}, st = s.res[r.id];
      if (r.with) { st.ever = s.friends[r.with].ever; st.state = st.ever ? 'happy' : 'sad'; continue; }
      st.ever = !!src.ever || src.state === 'happy';
      const spots = Array.isArray(src.spots) ? src.spots.map(pt).filter(Boolean).slice(0, 6) : null;
      if (spots && (r.arrive ? spots.length === r.find : spots.length > 0)) st.spots = spots;
      const n = spotsOf(s, r).length;
      st.got = Array.isArray(src.got) ? [...new Set(src.got)].filter((i) => Number.isInteger(i) && i >= 0 && i < n) : [];
      st.state = ['sad', 'play', 'happy'].includes(src.state) ? src.state : r.arrive ? 'away' : 'sad';
      if (r.arrive && !s.ending) { st.state = 'away'; st.ever = false; }
      if (st.state === 'play' && st.got.length >= n) st.state = 'sad';
    }
    const got = Array.isArray(d.shells?.got) ? [...new Set(d.shells.got)].filter((i) => Number.isInteger(i) && i >= 0 && i < SHELLS.length) : null;
    const chapu = s.friends.chapu;
    if (got && got.length < SHELL_NEED && (chapu.state === 'play' || chapu.ever)) s.shells = { got };
    else if (chapu.state === 'play') chapu.state = 'sad';
    const ids = FRIENDS.map((f) => f.id);
    const follows = (id) => s.friends[id].state === 'happy' || (id === 'chapu' && !!s.shells);
    s.party = (Array.isArray(d.party) ? [...new Set(d.party)] : []).filter((id) => ids.includes(id) && follows(id));
    for (const id of ids) if (follows(id) && !s.party.includes(id)) s.party.push(id);
    const ever = ids.filter((id) => s.friends[id].ever);
    s.stickers = [...ever, ...RESIDENTS.filter((r) => !r.arrive && s.res[r.id].ever).map((r) => r.id)];
    s.letters = ever.slice();
    checkFogs(s);
    s.shards = Array.isArray(d.shards) ? [...new Set(d.shards)].filter((x) => Number.isInteger(x) && x >= 0 && x < SHARDS.length) : [];
    s.seen = Array.isArray(d.seen) ? [...new Set(d.seen)].filter((x) => typeof x === 'string').slice(0, 40) : [];
    // まいにち・おみせ・アルバム
    s.day = s.ending ? clamp(d.day | 0, 1, 9999) : 1;
    s.today = s.ending && Array.isArray(d.today) ? d.today.filter((t) => t && (t.kind === 'friend' ? ids.includes(t.id) : !!resById(t.id))).map((t) => ({ kind: t.kind === 'friend' ? 'friend' : 'res', id: t.id })) : [];
    s.phase = 'day'; dayCheck(s); s.hearts = 0;
    // まえの ほぞんデータ（ハートが まだ ない ころ）には、いままでの えがおの ぶんを わたす
    s.hearts = Number.isFinite(+d.hearts) ? clamp(Math.floor(+d.hearts), 0, 99999) : smiles(s) * 2 + s.shards.length;
    const outfitIds = OUTFITS.map((o) => o.id);
    s.owned = [...new Set([...START_OWNED, ...(Array.isArray(d.owned) ? d.owned.filter((x) => outfitIds.includes(x)) : [])])];
    for (const slot of Object.keys(DEFAULT_OUTFIT)) {
      const id = d.outfit?.[slot];
      if (s.owned.includes(id) && OUTFITS.find((o) => o.id === id).slot === slot) s.outfit[slot] = id;
    }
    s.decos = Array.isArray(d.decos) ? [...new Set(d.decos)].filter((x) => DECOS.some((y) => y.id === x)).slice(0, DECO_SPOTS.length) : [];
    s.album.sky = Array.isArray(d.album?.sky) ? [...new Set(d.album.sky)].filter((i) => Number.isInteger(i) && i >= 0 && i < SKY_SHAPES.length) : [];
    if (s.friends.kumokumo.ever && s.friends.kumokumo.sky === undefined) s.friends.kumokumo.sky = 0;
    if (s.friends.kumokumo.sky !== undefined && !s.album.sky.includes(s.friends.kumokumo.sky)) s.album.sky.push(s.friends.kumokumo.sky);
    s.album.jelly = Array.isArray(d.album?.jelly) ? d.album.jelly.filter(Array.isArray).map((l) => l.filter((t) => TOPPINGS.includes(t)).slice(0, DECO_MAX)).filter((l) => l.length).slice(0, 8) : [];
    if (!s.album.jelly.length && s.friends.jelly.deco?.length) s.album.jelly.push(s.friends.jelly.deco.slice());
    const p = pt(d.player);
    s.player = p && walkable(s, p) ? pushOut(p, s) : { ...PLAYER_START };
    s.sound = d.sound !== false;
    return s;
  } catch { return null; }
}
