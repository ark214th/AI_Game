// 1回のラン：受けた依頼 → 館への収納 → 潜行（閃光の部屋と祭壇の部屋）→ 精算。描画には依存しない。

import { ITEMS, ITEM_BY_ID } from '../../content/items.mjs';
import { FURNITURE } from '../../content/palace.mjs';
import { REWARD } from '../../config/tuning.mjs';

export function createRun({ requests, loci, profile, rng, meta = {} }) {
  const cfg = profile.run;
  const items = [];
  requests.forEach((r, ri) => r.items.forEach((id) => items.push({ id, req: ri })));
  if (items.length > loci.length) throw new Error('置き場が足りない');
  items.forEach((it, i) => {
    it.locus = i;
    it.reaction = rng.int(FURNITURE[loci[i].furn].reactions.length);
  });

  // 潜行の部屋の並び：閃光の部屋をいくつか抜けると祭壇がある
  const seq = [];
  items.forEach((_, i) => {
    const [lo, hi] = cfg.flashBetween;
    const n = lo + rng.int(hi - lo + 1);
    for (let k = 0; k < n; k++) seq.push({ type: 'flash' });
    seq.push({ type: 'altar', item: i });
  });

  const oilMax = cfg.oilBase + (meta.oilUp || 0);
  return {
    requests,
    items,
    loci: loci.slice(0, items.length),
    seq,
    step: 0,
    oil: oilMax,
    oilMax,
    lamps: cfg.lampsBase + (meta.lampUp || 0),
    placed: 0,
    collected: items.map(() => null), // true / false / null（たどり着けなかった）
    lampUsed: items.map(() => false),
    flashCoins: 0,
    flashOk: 0,
    flashN: 0,
    over: false,
    endReason: null,
  };
}

export function storeSeconds(profile, itemCount) {
  const c = profile.run;
  return c.storeSecBase == null ? null : c.storeSecBase + c.storeSecPerItem * itemCount;
}

// 収納を終えたとき：時間を残して終えるとランタン油にボーナス
export function finishStore(run, profile, timeLeftRatio) {
  const bonus = profile.run.timeBonusRatio > 0 && timeLeftRatio >= profile.run.timeBonusRatio ? 1 : 0;
  return { run: { ...run, oil: run.oil + bonus, placed: run.items.length }, oilBonus: bonus };
}

export const currentRoom = (run) => run.seq[run.step];

function advance(run) {
  const n = { ...run, step: run.step + 1 };
  if (n.oil <= 0) { n.over = true; n.endReason = 'oil'; }
  else if (n.step >= n.seq.length) { n.over = true; n.endReason = 'done'; }
  return n;
}

export function applyFlash(run, success) {
  const n = { ...run, flashN: run.flashN + 1 };
  if (success) {
    n.flashOk = run.flashOk + 1;
    n.flashCoins = run.flashCoins + REWARD.flash;
  } else {
    n.oil = run.oil - 1;
  }
  return advance(n);
}

// 祭壇の候補。level が上がるほど紛らわしい（同じカテゴリ、依頼にあるが順番の違う品）
export function altarCandidates(run, i, rng, level) {
  const correct = ITEM_BY_ID[run.items[i].id];
  const inRun = new Set(run.items.map((it) => it.id));
  const outside = ITEMS.filter((it) => !inRun.has(it.id));
  const same = rng.shuffle(outside.filter((it) => it.cat === correct.cat));
  const other = rng.shuffle(outside.filter((it) => it.cat !== correct.cat));
  const runOthers = rng.shuffle(run.items.filter((it, k) => k !== i).map((it) => ITEM_BY_ID[it.id]));
  const total = [3, 4, 5, 5][Math.max(0, Math.min(3, level))];
  const nSame = [0, 1, 1, 2][level] || 0;
  const nRun = level >= 2 ? Math.min(1, runOthers.length) : 0;
  const dummies = [...same.slice(0, nSame), ...runOthers.slice(0, nRun)];
  for (const it of other) {
    if (dummies.length >= total - 1) break;
    dummies.push(it);
  }
  return rng.shuffle([correct, ...dummies.slice(0, total - 1)]).map((it) => it.id);
}

export function applyAltar(run, chosenId, { lamp = false } = {}) {
  const i = currentRoom(run).item;
  const ok = chosenId === run.items[i].id;
  const n = { ...run, collected: run.collected.slice(), lampUsed: run.lampUsed.slice() };
  n.collected[i] = ok;
  n.lampUsed[i] = lamp;
  if (!ok) n.oil = run.oil - 1;
  return { run: advance(n), ok, index: i };
}

export function useLamp(run) {
  return run.lamps > 0 ? { ...run, lamps: run.lamps - 1 } : run;
}

export function settle(run) {
  let itemCoins = 0;
  let bonusCoins = 0;
  const reqs = run.requests.map((r, ri) => {
    const idx = run.items.map((it, k) => (it.req === ri ? k : -1)).filter((k) => k >= 0);
    const got = idx.filter((k) => run.collected[k] === true);
    got.forEach((k) => { itemCoins += Math.round(REWARD.perItem * (run.lampUsed[k] ? REWARD.lampPenalty : 1)); });
    const complete = got.length === idx.length;
    if (complete) bonusCoins += r.reward;
    return { request: r, indices: idx, got: got.length, total: idx.length, complete };
  });
  const multi = REWARD.multi[Math.min(REWARD.multi.length - 1, run.requests.length)];
  const base = itemCoins + bonusCoins + run.flashCoins;
  const total = Math.round(base * multi);
  const attempted = run.collected.filter((c) => c !== null).length;
  const correct = run.collected.filter((c) => c === true).length;
  return {
    reqs, itemCoins, bonusCoins, flashCoins: run.flashCoins, multi, total,
    attempted, correct, items: run.items.length,
    allComplete: reqs.every((r) => r.complete),
  };
}

// 次のおすすめの品数：全部思い出せたら1つ増やし、半分近く落としたら1つ減らす
export function nextRecommended(rec, result, capacity) {
  let n = rec;
  if (result.correct === result.items && result.items >= rec) n = rec + 1;
  else if (result.attempted > 0 && result.correct / result.items < 0.6) n = rec - 1;
  return Math.max(3, Math.min(capacity, n));
}
