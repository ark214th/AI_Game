// 計算（画面と切り離す）：いどう・ともだちの じょうたい・だんかい かいほう・
// 5つの ミッション・かけら あつめ・えがお・ほぞんデータの かたち
import {
  FRIENDS, STAGES, MISSIONS, HANDS, HAT_SPOTS, STAR_SPOTS, STAR_RUNNER, STAR_RUNNER_TO,
  SHELL_SPOTS, SHARD_SPOTS, ISLAND_R, PLAYER_R, SPEED, NEAR, PLAYER_START,
} from './data.mjs';

export const SAVE_KEY = 'punyu-hachamecha-v1';
export const friendById = (id) => FRIENDS.find((f) => f.id === id);

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// あたらしい ほぞんデータ
export function newSave() {
  const friends = {};
  for (const f of FRIENDS) friends[f.id] = { state: 'away' };
  const s = {
    version: 1,
    player: { x: PLAYER_START.x, z: PLAYER_START.z },
    dir: { x: 0, z: 0 },
    facing: 0,
    friends,
    stage: 0,
    mission: null,
    stickers: [],
    letters: [],
    shards: [],
    smiles: 0,
    ending: false,
    sound: true,
  };
  openStage(s, 0);
  return s;
}

// だんかいの ともだちを「こまった」に する。あたらしく でてきた こを かえす
export function openStage(s, stage) {
  const born = [];
  for (const id of STAGES[stage] || []) {
    if (s.friends[id].state === 'away') { s.friends[id].state = 'sad'; born.push(id); }
  }
  return born;
}

// たすけ おわった こが いる だんかいの つぎを ひらく。あたらしい こを かえす
export function refreshUnlocks(s) {
  const born = [];
  while (s.stage < STAGES.length) {
    const cur = STAGES[s.stage];
    if (!cur.every((id) => s.friends[id].state === 'happy')) break;
    s.stage += 1;
    born.push(...openStage(s, s.stage));
  }
  return born;
}

export const allHappy = (s) => FRIENDS.every((f) => s.friends[f.id].state === 'happy');
export const isNear = (s, pos, r = NEAR) => dist(s.player, pos) < r;

// ---- いどう ----
export function setDir(s, x, z) {
  const len = Math.hypot(x, z);
  if (len > 0.01) { s.dir = { x: x / len, z: z / len }; s.facing = Math.atan2(s.dir.x, s.dir.z); }
  else s.dir = { x: 0, z: 0 };
}

export function stepPlayer(s, dt) {
  if (s.dir.x === 0 && s.dir.z === 0) return false;
  let nx = s.player.x + s.dir.x * SPEED * dt;
  let nz = s.player.z + s.dir.z * SPEED * dt;
  const d = Math.hypot(nx, nz);
  if (d > PLAYER_R) { nx *= PLAYER_R / d; nz *= PLAYER_R / d; }
  s.player.x = clamp(nx, -ISLAND_R, ISLAND_R);
  s.player.z = clamp(nz, -ISLAND_R, ISLAND_R);
  return true;
}

// ちかくに いる「こまった」な こ（はなしかけ られる こ）
export function nearSadFriend(s) {
  if (s.mission) return null;
  for (const f of FRIENDS) {
    if (s.friends[f.id].state === 'sad' && isNear(s, f.pos)) return f.id;
  }
  return null;
}

// ---- ミッション ----
export function startMission(s, friendId, rng = Math.random) {
  if (s.mission || s.friends[friendId]?.state !== 'sad') return null;
  const type = MISSIONS[friendId].type;
  const m = { friend: friendId, type };
  if (type === 'janken') { m.wins = 0; m.rounds = 0; m.crab = 1; m.last = null; }
  if (type === 'hat') { m.touches = 0; m.hat = pickSpot(rng, -1); }
  if (type === 'stars') { m.got = []; m.ran = false; m.spots = STAR_SPOTS.map((p) => ({ ...p })); }
  if (type === 'shells') { m.got = []; }
  if (type === 'cream') { m.taps = 0; }
  s.mission = m;
  return m;
}

function pickSpot(rng, avoid) {
  let i = Math.floor(rng() * HAT_SPOTS.length);
  if (i === avoid) i = (i + 1) % HAT_SPOTS.length;
  return i;
}

function completeMission(s) {
  const id = s.mission.friend;
  s.mission = null;
  s.friends[id].state = 'happy';
  s.smiles += 1;
  if (!s.stickers.includes(id)) s.stickers.push(id);
  if (!s.letters.includes(id)) s.letters.push(id);
  const born = refreshUnlocks(s);
  let ending = false;
  if (allHappy(s) && !s.ending) {
    s.ending = true; ending = true;
    if (!s.stickers.includes('niji')) s.stickers.push('niji');
  }
  return { friend: id, born, ending };
}

// じゃんけん：'win' | 'lose' | 'draw'、せいこうしたら {done:true,...}
export function jankenPlay(s, hand, rng = Math.random) {
  const m = s.mission;
  if (!m || m.type !== 'janken') return null;
  const opp = HANDS[Math.floor(rng() * 3)];
  m.rounds += 1;
  m.crab = 1 + m.rounds * 0.12;
  let result = 'draw';
  if (hand !== opp) {
    const win = (hand === 'gu' && opp === 'choki') || (hand === 'choki' && opp === 'pa') || (hand === 'pa' && opp === 'gu');
    result = win ? 'win' : 'lose';
  }
  if (result === 'win') m.wins += 1;
  m.last = { you: hand, opp, result };
  if (m.wins >= MISSIONS.kani.wins) return { ...m.last, done: true, ...completeMission(s) };
  return { ...m.last, done: false };
}

export const hatPos = (s) => (s.mission?.type === 'hat' ? HAT_SPOTS[s.mission.hat] : null);

// ぼうしに さわる（ちかくに いるとき だけ）
export function touchHat(s, rng = Math.random) {
  const m = s.mission;
  if (!m || m.type !== 'hat' || !isNear(s, hatPos(s), 3)) return null;
  m.touches += 1;
  if (m.touches >= MISSIONS.kaze.touches) return { done: true, ...completeMission(s) };
  m.hat = pickSpot(rng, m.hat);
  return { done: false, touches: m.touches, hat: m.hat };
}

// ほしを あつめる。にげる ほしは 1かい めは 'ran' を かえす
export function collectStar(s, i) {
  const m = s.mission;
  if (!m || m.type !== 'stars' || m.got.includes(i)) return null;
  if (!isNear(s, m.spots[i], 3)) return null;
  if (i === STAR_RUNNER && !m.ran) {
    m.ran = true;
    m.spots[i] = { ...STAR_RUNNER_TO };
    return { ran: true };
  }
  m.got.push(i);
  if (m.got.length >= MISSIONS.kumokumo.count) return { done: true, ...completeMission(s) };
  return { done: false, got: m.got.length };
}

// かいがらを さがす
export function collectShell(s, i) {
  const m = s.mission;
  if (!m || m.type !== 'shells' || m.got.includes(i)) return null;
  if (!isNear(s, SHELL_SPOTS[i], 3)) return null;
  m.got.push(i);
  if (m.got.length >= MISSIONS.chapu.count) return { done: true, ...completeMission(s) };
  return { done: false, got: m.got.length };
}

// クリームを のせる（ゼリーの ちかくで トントン）
export function tapCream(s) {
  const m = s.mission;
  if (!m || m.type !== 'cream') return null;
  if (!isNear(s, friendById('jelly').pos, 3.2)) return null;
  m.taps += 1;
  if (m.taps >= MISSIONS.jelly.taps) return { done: true, ...completeMission(s) };
  return { done: false, taps: m.taps };
}

// ---- かけら ----
export function collectShard(s, i) {
  if (s.shards.includes(i)) return false;
  if (!isNear(s, SHARD_SPOTS[i], 2.2)) return false;
  s.shards.push(i);
  return true;
}

// いま タップ/ボタンで さわれる ものを さがす（app の アクション けってい よう）
export function findAction(s) {
  const m = s.mission;
  if (m) {
    if (m.type === 'hat' && isNear(s, hatPos(s), 3)) return { kind: 'hat' };
    if (m.type === 'stars') { const i = m.spots.findIndex((p, j) => !m.got.includes(j) && isNear(s, p, 3)); if (i >= 0) return { kind: 'star', index: i }; }
    if (m.type === 'shells') { const i = SHELL_SPOTS.findIndex((p, j) => !m.got.includes(j) && isNear(s, p, 3)); if (i >= 0) return { kind: 'shell', index: i }; }
    if (m.type === 'cream' && isNear(s, friendById('jelly').pos, 3.2)) return { kind: 'cream' };
    return null;
  }
  const fid = nearSadFriend(s);
  if (fid) return { kind: 'talk', friend: fid };
  const si = SHARD_SPOTS.findIndex((p, j) => !s.shards.includes(j) && isNear(s, p, 2.2));
  if (si >= 0) return { kind: 'shard', index: si };
  return null;
}

// ---- ほぞん ----
export function serialize(s) {
  return JSON.stringify({
    version: 1,
    player: s.player, friends: s.friends, stage: s.stage,
    stickers: s.stickers, letters: s.letters, shards: s.shards,
    smiles: s.smiles, ending: s.ending, sound: s.sound,
  });
}

export function deserialize(json) {
  try {
    const d = typeof json === 'string' ? JSON.parse(json) : json;
    if (!d || d.version !== 1 || !d.friends) return null;
    const s = newSave();
    s.player = { x: clamp(+d.player?.x || 0, -PLAYER_R, PLAYER_R), z: clamp(+d.player?.z || 0, -PLAYER_R, PLAYER_R) };
    for (const f of FRIENDS) {
      const st = d.friends[f.id]?.state;
      if (['away', 'sad', 'happy'].includes(st)) s.friends[f.id].state = st;
    }
    s.stage = clamp(d.stage | 0, 0, STAGES.length - 1);
    s.stickers = Array.isArray(d.stickers) ? d.stickers.filter((x) => typeof x === 'string') : [];
    s.letters = Array.isArray(d.letters) ? d.letters.filter((x) => typeof x === 'string') : [];
    s.shards = Array.isArray(d.shards) ? d.shards.filter((x) => Number.isInteger(x) && x >= 0 && x < SHARD_SPOTS.length) : [];
    s.smiles = FRIENDS.filter((f) => s.friends[f.id].state === 'happy').length;
    s.ending = !!d.ending && allHappy(s);
    s.sound = d.sound !== false;
    return s;
  } catch { return null; }
}
