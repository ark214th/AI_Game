// node --test games/mnemo-manor/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES } from '../config/tuning.mjs';
import { createRng } from '../core/rng.mjs';
import { createStaircase, updateStaircase } from '../core/adaptive/staircase.mjs';
import {
  createFlashState, normalizeFlashState, makeTrial, judge, applyResult,
  durationMs, msToFrames, maxDurationLevel, reflectedDir, darkness, DIR_COUNT,
} from '../core/flash/flash.mjs';
import { createDive, applyDive } from '../core/flash/dive.mjs';
import { loadSave, writeSave, sanitize, exportJson, importJson, pushLog } from '../core/save/save.mjs';

const adult = PROFILES.adult;
const F60 = 1000 / 60;
const F120 = 1000 / 120;

test('乱数：同じ seed なら同じ列になる', () => {
  const a = createRng(42), b = createRng(42);
  for (let i = 0; i < 20; i++) assert.equal(a.next(), b.next());
  assert.notEqual(createRng(1).next(), createRng(2).next());
});

test('階段法：3回連続正解で1段階難しく、1回不正解で1段階やさしく', () => {
  let s = createStaircase({ max: 10 });
  s = updateStaircase(s, true);
  s = updateStaircase(s, true);
  assert.equal(s.level, 0);
  s = updateStaircase(s, true);
  assert.equal(s.level, 1);
  s = updateStaircase(s, false);
  assert.equal(s.level, 0);
  assert.equal(s.reversals, 1);
  s = updateStaircase(s, false);
  assert.equal(s.level, 0, '下限より下がらない');
});

test('階段法：成功率は約8割に落ち着く（見抜ける確率が表示時間で決まる仮想プレイヤー）', () => {
  const rng = createRng(7);
  let s = createStaircase({ max: 30 });
  const threshold = 12; // この段階で成功率50%〜の心理測定関数
  let ok = 0, n = 0;
  for (let i = 0; i < 6000; i++) {
    const p = 0.25 + 0.75 / (1 + Math.exp((s.level - threshold) * 0.9));
    const c = rng.next() < p;
    if (i > 500) { ok += c; n++; }
    s = updateStaircase(s, c);
  }
  const rate = ok / n;
  assert.ok(rate > 0.74 && rate < 0.84, `rate ${rate}`);
});

test('表示時間：対数スケールで短くなり、フレーム数に変換される', () => {
  assert.equal(durationMs(0, adult.flash), 500);
  assert.equal(Math.round(durationMs(1, adult.flash)), 400);
  assert.equal(Math.round(durationMs(2, adult.flash)), 320);
  assert.equal(msToFrames(500, F60), 30);
  assert.equal(msToFrames(3, F60), 1, '下限は1フレーム');
  const m60 = maxDurationLevel(adult.flash, F60);
  const m120 = maxDurationLevel(adult.flash, F120);
  assert.equal(msToFrames(durationMs(m60, adult.flash), F60), 1);
  assert.ok(msToFrames(durationMs(m60 - 1, adult.flash), F60) > 1);
  assert.ok(m120 > m60, '120Hz の端末はより短い表示まで行ける');
});

test('閃光：段階1は紋章だけ、段階2で宝箱、段階3で妨害物（宝箱と重ならない）', () => {
  const rng = createRng(3);
  let st = normalizeFlashState(null, adult, F60);
  const t1 = makeTrial(st, adult, rng, { frameMs: F60 });
  assert.equal(t1.target, null);
  assert.equal(t1.distractors.length, 0);
  assert.ok(t1.fixationMs >= 500 && t1.fixationMs <= 1000);

  st = { ...st, stage: 2 };
  const t2 = makeTrial(st, adult, rng, { frameMs: F60 });
  assert.ok(t2.target && t2.target.dir >= 0 && t2.target.dir < DIR_COUNT);
  assert.equal(t2.distractors.length, 0);

  st = { ...st, stage: 3, stairs: { ...st.stairs, distract: { ...st.stairs.distract, level: 5 } } };
  for (let i = 0; i < 200; i++) {
    const t3 = makeTrial(st, adult, rng, { frameMs: F60, theme: 'lake' });
    assert.equal(t3.distractors.length, 6);
    const dirs = new Set(t3.distractors.map((d) => d.dir));
    assert.equal(dirs.size, 6, '妨害物どうしも重ならない');
    assert.ok(!dirs.has(t3.target.dir));
    if (t3.reflection) {
      assert.notEqual(t3.reflection.dir, t3.target.dir);
      assert.ok(!dirs.has(t3.reflection.dir));
    }
  }
});

test('反射した偽像は、本物と同じ方向には出ない', () => {
  for (let d = 0; d < DIR_COUNT; d++) assert.notEqual(reflectedDir(d), d);
  assert.equal(reflectedDir(0), 4);
  assert.equal(reflectedDir(1), 3);
});

test('判定：段階1は紋章だけ、段階2以降は両方そろって成功', () => {
  const t1 = { emblem: 2, target: null };
  assert.deepEqual(judge(t1, { emblem: 2, dir: null }), { emblemOk: true, dirOk: null, success: true });
  const t2 = { emblem: 1, target: { dir: 5, ecc: 0.5 } };
  assert.equal(judge(t2, { emblem: 1, dir: 5 }).success, true);
  assert.equal(judge(t2, { emblem: 1, dir: 4 }).success, false);
  assert.equal(judge(t2, { emblem: 0, dir: 5 }).success, false);
});

test('段階：よくできていれば上がり、表示時間は少し戻る。うまくいかなければ下がる', () => {
  const rng = createRng(11);
  let st = createFlashState(adult);
  st = { ...st, stairs: { ...st.stairs, duration: { ...st.stairs.duration, level: 6 } } };
  let changed = 0;
  for (let i = 0; i < 12 && !changed; i++) {
    const t = makeTrial(st, adult, rng, { frameMs: F60 });
    const r = applyResult(st, t, { success: true, emblemOk: true, dirOk: null }, adult);
    st = r.state;
    changed = r.stageChange;
  }
  assert.equal(changed, 1);
  assert.equal(st.stage, 2);
  assert.ok(st.stairs.duration.level < 9, '段階が上がると表示時間をやさしく戻す');

  let down = 0;
  for (let i = 0; i < 12 && !down; i++) {
    const t = makeTrial(st, adult, rng, { frameMs: F60 });
    const r = applyResult(st, t, { success: false, emblemOk: false, dirOk: false }, adult);
    st = r.state;
    down = r.stageChange;
  }
  assert.equal(down, -1);
  assert.equal(st.stage, 1);
});

test('要素ごとの階段：段階2では表示時間と距離を交互に動かす。フレーム落ちの回は動かさない', () => {
  const rng = createRng(5);
  let st = { ...createFlashState(adult), stage: 2 };
  const foci = [];
  for (let i = 0; i < 4; i++) {
    const t = makeTrial(st, adult, rng, { frameMs: F60 });
    foci.push(t.focus);
    st = applyResult(st, t, { success: true, emblemOk: true, dirOk: true }, adult).state;
  }
  assert.deepEqual(foci, ['duration', 'ecc', 'duration', 'ecc']);

  const t = makeTrial(st, adult, rng, { frameMs: F60 });
  const skipped = applyResult(st, t, { success: false }, adult, { skipStair: true }).state;
  assert.deepEqual(skipped.stairs, st.stairs);
});

test('壊れたセーブでも閃光の状態は正しく整う', () => {
  const st = normalizeFlashState({ stage: 9, stairs: { duration: { level: 999 } }, stageHistory: 'x' }, adult, F60);
  assert.equal(st.stage, 3);
  assert.equal(st.stairs.duration.level, maxDurationLevel(adult.flash, F60));
  assert.deepEqual(st.stageHistory, []);
  assert.ok(darkness(st) === 1);
  assert.equal(darkness(createFlashState(adult)), 0);
});

test('潜行：失敗で油が減り、尽きたら終わり。連続成功で油が戻る', () => {
  let d = createDive(adult);
  assert.equal(d.oil, 6);
  d = applyDive(d, { success: false }).dive;
  assert.equal(d.oil, 5);
  let gained = 0;
  for (let i = 0; i < 5; i++) {
    const r = applyDive(d, { success: true });
    d = r.dive;
    gained += r.events.oilGained;
  }
  assert.equal(gained, 1);
  assert.equal(d.oil, 6);
  assert.equal(d.bestCombo, 5);
  while (!d.over) d = applyDive(d, { success: false }).dive;
  assert.ok(d.oil <= 0 || d.room >= d.rooms);

  let e = createDive(adult);
  for (let i = 0; i < adult.dive.rooms; i++) e = applyDive(e, { success: true }).dive;
  assert.ok(e.over);
  assert.equal(e.treasures, adult.dive.rooms);
});

test('セーブ：保存・読みこみ・書き出し・読みこみ直し', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const s = loadSave(storage);
  assert.equal(s.profile, 'adult');
  s.profile = 'child';
  s.flash.child = createFlashState(PROFILES.child);
  for (let i = 0; i < 700; i++) pushLog(s, { i });
  assert.equal(s.log.length, 600);
  assert.ok(writeSave(storage, s));
  const back = loadSave(storage);
  assert.equal(back.profile, 'child');
  assert.equal(back.log[0].i, 100);
  const again = importJson(exportJson(back));
  assert.equal(again.profile, 'child');
  assert.throws(() => importJson('{"foo":1}'));
  assert.equal(loadSave({ getItem: () => '{broken' }).profile, 'adult');
  assert.equal(loadSave({ getItem: () => { throw new Error('blocked'); } }).profile, 'adult');
  assert.equal(sanitize({ profile: 'evil' }).profile, 'adult');
});
