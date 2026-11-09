// 計算（画面と切り離す）：しまと はしの うえの いどう・ともだちの じょうたい・
// あそび（かいがら・じゃんけん）・はなまる・もや・かけら・あんない・ほぞんデータの かたち
import {
  ISLANDS, BRIDGES, FOGS, TREES, ROCKS, POND, SEA, EDGE, FRIENDS, SHELLS, SHELL_NEED, shellPos, BEACH_SPOT,
  HANDS, BEATS, JANKEN_WINS, TELL_MS, SHARDS, SPEED, PLAYER_START, TALK_R, TOUCH_R,
} from './data.mjs';

export const SAVE_KEY = 'punyu-hachamecha-v2';
export const friendById = (id) => FRIENDS.find((f) => f.id === id);
const islandById = (id) => ISLANDS.find((i) => i.id === id);

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// あたらしい ほぞんデータ
export function newSave() {
  const friends = {};
  for (const f of FRIENDS) friends[f.id] = { state: 'sad', best: 0 };
  return {
    version: 2,
    player: { ...PLAYER_START },
    dir: { x: 0, z: 0 },
    facing: Math.PI,
    time: 0,
    friends,            // state: 'sad'（こまった）| 'play'（いっしょに あそんでいる）| 'happy'（えがお）
    party: [],          // ぷにゅに ついてくる じゅんばん
    shells: null,       // かいがら あそびの とちゅう { got: [ばんごう] }
    janken: null,       // じゃんけんの とちゅう
    cleared: [],        // はれた もや
    stickers: [],
    letters: [],
    shards: [],
    sound: true,
  };
}

export const smiles = (s) => FRIENDS.filter((f) => s.friends[f.id].state === 'happy').length;
export const fogCleared = (s, id) => s.cleared.includes(id);

// ---- あるける ばしょ ----
const OBSTACLES = [
  ...TREES.map((t) => ({ x: t.x, z: t.z, r: 0.75 * t.s })),
  ...ROCKS.map((r) => ({ x: r.x, z: r.z, r: r.r * 0.95 })),
  { x: POND.x, z: POND.z, r: POND.r - 0.5 },
  { x: SEA.x, z: SEA.z, r: SEA.deep },   // ふかい ところ へは いけない（あさせは あるける）
];
const PLAYER_BODY = 0.8;

export function bridgeOpen(s, b) { return !b.soon && (!b.fog || fogCleared(s, b.fog)); }

// はしの うえか（along: a からの きょり、len: はしの ながさ）
function onBridge(b, p, margin = 0) {
  const dx = b.b.x - b.a.x, dz = b.b.z - b.a.z, len = Math.hypot(dx, dz);
  const ux = dx / len, uz = dz / len;
  const along = (p.x - b.a.x) * ux + (p.z - b.a.z) * uz;
  const side = Math.abs((p.x - b.a.x) * -uz + (p.z - b.a.z) * ux);
  return along >= -margin && along <= len + margin && side <= b.hw - 0.3;
}
const inIsland = (i, p) => !i.soon && dist(i, p) <= i.r - EDGE;

export function walkable(s, p) {
  if (ISLANDS.some((i) => inIsland(i, p))) return true;
  return BRIDGES.some((b) => bridgeOpen(s, b) && onBridge(b, p, 0.6));
}

// いま いる しま（はしの うえ なら null）
export function islandAt(p) {
  const i = ISLANDS.find((x) => inIsland(x, p));
  return i ? i.id : null;
}

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

function pushOut(p) {
  for (const o of OBSTACLES) {
    const d = dist(o, p), min = o.r + PLAYER_BODY;
    if (d < min && d > 0.0001) { p.x = o.x + ((p.x - o.x) / d) * min; p.z = o.z + ((p.z - o.z) / d) * min; }
  }
  return p;
}

export function stepPlayer(s, dt) {
  s.time += dt;
  if (s.janken || (s.dir.x === 0 && s.dir.z === 0)) return false;
  const p = s.player;
  const want = pushOut({ x: p.x + s.dir.x * SPEED * dt, z: p.z + s.dir.z * SPEED * dt });
  // そのまま → よこだけ → たてだけ → しまの ふちに そって すべる
  const tries = [want, pushOut({ x: want.x, z: p.z }), pushOut({ x: p.x, z: want.z })];
  const home = ISLANDS.find((i) => inIsland(i, p));
  if (home) {
    const d = dist(home, want), max = home.r - EDGE - 0.01;
    if (d > max) tries.push(pushOut({ x: home.x + ((want.x - home.x) / d) * max, z: home.z + ((want.z - home.z) / d) * max }));
  }
  for (const t of tries) {
    if (walkable(s, t) && (t.x !== p.x || t.z !== p.z)) { p.x = t.x; p.z = t.z; return true; }
  }
  return false;
}

// ---- なみ ----
export const waveR = (t) => SEA.mid + SEA.amp * Math.sin((t / SEA.period) * Math.PI * 2);
export const shellShown = (sh, t) => waveR(t) < sh.d;

// ---- ともだち ----
// ついてくる こは ぷにゅの そば、まだの こは home に いる
export function nearTalkable(s) {
  if (s.janken) return null;
  for (const f of FRIENDS) {
    if (s.friends[f.id].state === 'sad' && dist(s.player, f.home) < TALK_R) return f.id;
  }
  return null;
}

// はなしかける。あそびを はじめる
export function talk(s, id, rng = Math.random) {
  const f = friendById(id), fr = s.friends[id];
  if (!f || fr.state !== 'sad' || s.janken) return null;
  if (dist(s.player, f.home) >= TALK_R) return null;
  return beginPlay(s, id, rng);
}

function beginPlay(s, id, rng) {
  const f = friendById(id);
  if (s.friends[id].state === 'sad') s.friends[id].state = 'play';
  if (f.play === 'shells') {
    s.shells = { got: [] };
    if (!s.party.includes(id)) s.party.push(id);   // ちゃぷは いっしょに さがしに くる
  }
  if (f.play === 'janken') {
    s.janken = { friend: id, wins: 0, losses: 0, rounds: 0, opp: null };
    jankenReady(s, rng);
  }
  return { friend: id, play: f.play };
}

// えがおに なった あと、もういちど あそぶ（はなまるを ふやせる）
export function replay(s, id, rng = Math.random) {
  if (s.friends[id]?.state !== 'happy' || s.janken || s.shells) return null;
  return beginPlay(s, id, rng);
}

function complete(s, id, flowers) {
  const fr = s.friends[id];
  const first = fr.state !== 'happy';
  fr.state = 'happy';
  const better = flowers > fr.best;
  fr.best = Math.max(fr.best, flowers);
  if (!s.party.includes(id)) s.party.push(id);
  if (!s.stickers.includes(id)) s.stickers.push(id);
  if (!s.letters.includes(id)) s.letters.push(id);
  const cleared = [];
  for (const fog of FOGS) {
    if (!s.cleared.includes(fog.id) && smiles(s) >= fog.need) { s.cleared.push(fog.id); cleared.push(fog.id); }
  }
  return { done: true, friend: id, flowers, best: fr.best, first, better, cleared };
}

// ---- かいがら ----
// なみが ひいて みえている かいがらに ふれると ひろえる
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
export const tellMs = (round) => TELL_MS[Math.min(round, TELL_MS.length - 1)];

// カニが つぎの てを きめる（この てを「ぴくっ」と みせる）
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
export function jankenQuit(s) {
  const j = s.janken;
  if (!j) return false;
  if (s.friends[j.friend].state === 'play') s.friends[j.friend].state = 'sad';
  s.janken = null;
  return true;
}

// ---- かけら ----
export function touchShards(s) {
  for (let i = 0; i < SHARDS.length; i++) {
    if (!s.shards.includes(i) && dist(s.player, SHARDS[i]) < TOUCH_R) { s.shards.push(i); return i; }
  }
  return -1;
}

// ---- あんない（ちょうちょ） ----
// いま めざすと よい ばしょ。なにも なければ null
export function guideGoal(s) {
  if (s.janken) return null;
  if (s.shells) return { ...BEACH_SPOT, kind: 'beach' };
  let best = null;
  for (const f of FRIENDS) {
    if (s.friends[f.id].state !== 'sad') continue;
    const d = dist(s.player, f.home);
    if (!best || d < best.d) best = { x: f.home.x, z: f.home.z, kind: 'friend', id: f.id, d };
  }
  if (best) return best;
  const soon = BRIDGES.find((b) => b.soon && (!b.fog || fogCleared(s, b.fog)));
  return soon ? { x: soon.a.x, z: soon.a.z, kind: 'soon' } : null;
}

// しまから しまへの みち（ひらいている はし だけ）
function islandPath(s, from, to) {
  const seen = new Set([from]), queue = [[from]];
  while (queue.length) {
    const path = queue.shift(), cur = path[path.length - 1];
    if (cur === to) return path;
    for (const b of BRIDGES) {
      if (!bridgeOpen(s, b)) continue;
      const next = b.from === cur ? b.to : b.to === cur ? b.from : null;
      if (next && !seen.has(next)) { seen.add(next); queue.push([...path, next]); }
    }
  }
  return null;
}

// めざす ばしょへ いく ための、つぎの とちゅうの ばしょ（はしを わたる ときは はしの いりぐち・でぐち）
export function guideStep(s) {
  const goal = guideGoal(s);
  if (!goal) return null;
  const here = islandAt(s.player);
  const there = islandAt(goal) || ISLANDS.reduce((a, b) => (dist(a, goal) - a.r < dist(b, goal) - b.r ? a : b)).id;
  if (here === there) return goal;
  if (!here) {
    // はしの うえ：めざす しまに ちかい ほうの はしっこへ
    const b = BRIDGES.find((x) => bridgeOpen(s, x) && onBridge(x, s.player, 0.7));
    if (!b) return goal;
    const path = islandPath(s, b.to, there), back = islandPath(s, b.from, there);
    const toB = path && (!back || path.length <= back.length);
    return { ...(toB ? b.b : b.a), kind: 'bridge' };
  }
  const path = islandPath(s, here, there);
  if (!path || path.length < 2) return goal;
  const b = BRIDGES.find((x) => bridgeOpen(s, x) && ((x.from === here && x.to === path[1]) || (x.to === here && x.from === path[1])));
  const near = b.from === here ? b.a : b.b, far = b.from === here ? b.b : b.a;
  return { ...(dist(s.player, near) > 2 ? near : far), kind: 'bridge' };
}

// ---- ほぞん ----
export function serialize(s) {
  return JSON.stringify({
    version: 2,
    player: s.player, friends: s.friends, party: s.party, shells: s.shells,
    cleared: s.cleared, stickers: s.stickers, letters: s.letters, shards: s.shards, sound: s.sound,
  });
}

export function deserialize(json) {
  try {
    const d = typeof json === 'string' ? JSON.parse(json) : json;
    if (!d || d.version !== 2 || !d.friends) return null;
    const s = newSave();
    const ids = FRIENDS.map((f) => f.id);
    for (const f of FRIENDS) {
      const src = d.friends[f.id] || {};
      if (['sad', 'play', 'happy'].includes(src.state)) s.friends[f.id].state = src.state;
      s.friends[f.id].best = clamp(src.best | 0, 0, 3);
      // じゃんけんは とちゅうから つづけない
      if (f.play === 'janken' && s.friends[f.id].state === 'play') s.friends[f.id].state = 'sad';
    }
    const got = Array.isArray(d.shells?.got) ? [...new Set(d.shells.got)].filter((i) => Number.isInteger(i) && i >= 0 && i < SHELLS.length) : null;
    const chapu = s.friends.chapu.state;
    if (got && got.length < SHELL_NEED && chapu !== 'sad') s.shells = { got };
    else if (chapu === 'play') s.friends.chapu.state = 'sad';
    const follows = (id) => s.friends[id].state === 'happy' || (id === 'chapu' && s.shells);
    s.party = (Array.isArray(d.party) ? [...new Set(d.party)] : []).filter((id) => ids.includes(id) && follows(id));
    for (const id of ids) if (follows(id) && !s.party.includes(id)) s.party.push(id);
    const happy = ids.filter((id) => s.friends[id].state === 'happy');
    s.stickers = happy.slice(); s.letters = happy.slice();
    s.cleared = FOGS.filter((f) => happy.length >= f.need).map((f) => f.id);
    s.shards = Array.isArray(d.shards) ? [...new Set(d.shards)].filter((x) => Number.isInteger(x) && x >= 0 && x < SHARDS.length) : [];
    const p = { x: +d.player?.x, z: +d.player?.z };
    s.player = Number.isFinite(p.x) && Number.isFinite(p.z) && walkable(s, p) ? p : { ...PLAYER_START };
    s.sound = d.sound !== false;
    return s;
  } catch { return null; }
}
