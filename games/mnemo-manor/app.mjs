// 画面の切り替え、ランの進行（依頼 → 収納 → 潜行 → 精算）、閃光のフレーム単位の進行、保存。

import { PROFILES, TIMING, FEEDBACK_MS, PEEK_MS } from './config/tuning.mjs';
import { createRng } from './core/rng.mjs';
import { makeTrial, judge, applyResult, normalizeFlashState, darkness, durationMs, EMBLEMS } from './core/flash/flash.mjs';
import { createStaircase, updateStaircase, withMax } from './core/adaptive/staircase.mjs';
import { routeLoci, capacity } from './core/palace/palace.mjs';
import { generateBoard } from './core/run/requests.mjs';
import { createRun, storeSeconds, finishStore, currentRoom, applyFlash, altarCandidates, applyAltar, useLamp, settle, nextRecommended } from './core/run/run.mjs';
import { loadSave, writeSave, pushLog, statsFor, exportJson, importJson, defaultSave } from './core/save/save.mjs';
import { createFlashView, THEME_NAMES } from './render/flash-view.mjs';
import { measureRefresh } from './render/timing.mjs';
import { createAnswerPad } from './ui/answer-pad.mjs';
import { createStoreView } from './ui/store-view.mjs';
import { createAltarView } from './ui/altar-view.mjs';
import { createBoardView, createShopView, shopCost, renderResult } from './ui/screens.mjs';
import * as sfx from './audio.mjs';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const rng = createRng(params.has('seed') ? Number(params.get('seed')) : (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);

const storage = (() => { try { return window.localStorage; } catch { return null; } })();
let save = loadSave(storage);
let profile = PROFILES[save.profile];
sfx.setSound(save.sound);

const view = createFlashView($('room'));
const pad = createAnswerPad($('answer'), view, { onSubmit, onTap: () => sfx.sfxTap() });
const boardView = createBoardView($('board'), { onStart: startStore, onBack: toTitle });
const storeView = createStoreView($('store'), { onDone: startDive, onPlace: () => sfx.sfxPlace(), onTimeUp: () => sfx.sfxTrap() });
const altarView = createAltarView($('altar'), { onChoose: onAltarChoose, onLamp: onAltarLamp, onNext: enterRoom });
const shopView = createShopView($('shop'), { onBuy, onBack: () => (shopReturn === 'result' ? showScreen('result') : toTitle()) });

let timing = { frameMs: 1000 / 60, hz: 60 };
let flash = null;       // 閃光の状態（階段法など）
let altarStair = null;  // 祭壇の紛らわしさの階段
let run = null;         // 今回のラン
let trial = null;       // 閃光の今の1回
let phase = 'boot';     // boot / menu / store / fixation / stim / mask / answer / feedback / altar
let ph = {};            // 閃光のタイミング記録
let lastLog = null;
let shopReturn = 'title';

// ---------- 画面 ----------
const SCREENS = ['measure', 'title', 'howto', 'settings', 'result', 'board', 'shop'];
function showScreen(id) {
  for (const s of SCREENS) $(s).hidden = s !== id;
}

function refreshTitle() {
  const st = statsFor(save, profile.id);
  const m = save.meta;
  $('titleStats').textContent = `${profile.label} ／ 金貨 ${m.gold} ／ 館 ${m.rooms}部屋・置き場 ${capacity(m.rooms)}` + (st.runs ? ` ／ 潜った回数 ${st.runs}` : '');
}

function hideStages() {
  pad.hide();
  storeView.hide();
  altarView.hide();
  $('hud').hidden = true;
  $('banner').hidden = true;
}

function toTitle() {
  phase = 'menu';
  run = null;
  hideStages();
  refreshTitle();
  showScreen('title');
}

function recommended() {
  const r = save.recommend[profile.id];
  return Math.min(capacity(save.meta.rooms), Number.isInteger(r) ? r : profile.run.recommendStart);
}

function openBoard() {
  sfx.unlockAudio();
  phase = 'menu';
  hideStages();
  showScreen('board');
  boardView.show({ board: generateBoard(rng, { recommended: recommended() }), capacity: capacity(save.meta.rooms), recommended: recommended() });
}

function openShop(from) {
  shopReturn = from;
  showScreen('shop');
  shopView.show(save.meta);
}

function onBuy(kind) {
  const cost = shopCost(save.meta, kind);
  if (cost == null || save.meta.gold < cost) return;
  save.meta.gold -= cost;
  if (kind === 'room') save.meta.rooms += 1;
  else if (kind === 'oil') save.meta.oilUp += 1;
  else if (kind === 'lamp') save.meta.lampUp += 1;
  writeSave(storage, save);
  sfx.sfxStage(true);
  shopView.show(save.meta);
}

// ---------- 収納 ----------
function startStore(requests) {
  showScreen(null);
  const loci = routeLoci(save.meta.rooms);
  run = createRun({ requests, loci, profile, rng, meta: save.meta });
  phase = 'store';
  storeView.start({ run, allLoci: loci, seconds: storeSeconds(profile, run.items.length) });
  // 潜る前に、この端末の画面の書き換え速さを測っておく
  measureRefresh().then((t) => { timing = t; });
}

// ---------- 潜行 ----------
function startDive({ timeLeftRatio }) {
  const fs = finishStore(run, profile, timeLeftRatio);
  run = fs.run;
  storeView.hide();
  flash = normalizeFlashState(save.flash[profile.id], profile, timing.frameMs);
  const a = save.altar[profile.id];
  altarStair = withMax(a && Number.isFinite(a.level) ? { ...createStaircase(), ...a } : createStaircase(), profile.run.altarMaxLevel);
  $('hud').hidden = false;
  if (fs.oilBonus) banner('砂時計に余裕があった', 'ランタン油をひとつ多く持って潜る。', 2200);
  else banner('迷宮へ', '閃光の部屋を抜けると、祭壇がある。館を心の中でたどろう。', 2200);
  updateHud();
  enterRoom();
}

function enterRoom() {
  altarView.hide();
  pad.hide();
  if (!run) return;
  if (run.over) { endRun(); return; }
  const room = currentRoom(run);
  if (room.type === 'flash') {
    trial = makeTrial(flash, profile, rng, { frameMs: timing.frameMs, theme: pickTheme() });
    view.prepare(trial);
    phase = 'fixation';
    ph = {};
  } else {
    trial = null;
    phase = 'altar';
    const level = Math.min(altarStair.level, profile.run.altarMaxLevel);
    const candidates = altarCandidates(run, room.item, rng, level);
    ph = { altarLevel: level, tAltar: performance.now() };
    altarView.show({ run, index: room.item, candidates, allLoci: routeLoci(save.meta.rooms) });
    sfx.sfxAltar();
  }
  updateHud();
}

function pickTheme() {
  if (run.flashN < 2) return 'corridor';
  const pool = ['corridor', 'fog', 'storm'];
  if (flash.stage >= profile.flash.reflectionFromStage) pool.push('lake');
  return rng.pick(pool);
}

// ---------- HUD ----------
function flameScale(d) { return (1 - d * 0.6).toFixed(3); }

function updateHud() {
  if (!run) return;
  const nextAltar = run.seq.slice(run.step).find((r) => r.type === 'altar');
  const room = currentRoom(run);
  $('roomNo').textContent = nextAltar ? `祭壇 ${nextAltar.item + 1} / ${run.items.length}` : `祭壇 ${run.items.length} / ${run.items.length}`;
  $('roomName').textContent = room && room.type === 'altar' ? '祭壇の間' : trial ? THEME_NAMES[trial.theme] : '';
  $('treasures').textContent = run.flashOk;
  $('lamps').textContent = run.lamps;
  const oil = $('oil');
  const total = Math.max(run.oilMax, run.oil);
  if (oil.children.length !== total) {
    oil.innerHTML = '';
    for (let i = 0; i < total; i++) oil.appendChild(document.createElement('i'));
  }
  [...oil.children].forEach((el, i) => el.classList.toggle('off', i >= run.oil));
  if (flash) document.querySelector('#hud .lantern').style.setProperty('--flame', flameScale(darkness(flash)));
}

function hurtLantern() {
  const l = document.querySelector('#hud .lantern');
  l.classList.remove('hurt'); void l.offsetWidth; l.classList.add('hurt');
}

let calloutTimer = 0;
function callout(text, kind) {
  const el = $('callout');
  el.textContent = text;
  el.className = `show ${kind || ''}`;
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(() => { el.className = kind || ''; }, 900);
}

let bannerTimer = 0;
function banner(title, text, ms = 3200) {
  $('bannerTitle').textContent = title;
  $('bannerText').textContent = text;
  $('banner').hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { $('banner').hidden = true; }, ms);
}

const STAGE_TEXT = {
  1: ['閃光の段階 1', 'まんなかの紋章を見抜こう。'],
  2: ['閃光の段階 2', 'まわりに宝箱が光る。紋章と、宝箱の方向の両方を答えよう。目はまんなかのままで。'],
  3: ['閃光の段階 3', 'コウモリや偽の宝箱がまぎれこむ。本物の宝箱の方向を答えよう。'],
};

// ---------- 閃光の回答 ----------
function restartTrial() {
  if (!['fixation', 'stim', 'mask'].includes(phase)) return;
  pad.hide();
  phase = 'fixation';
  ph = {};
}

function onSubmit(answer) {
  if (phase !== 'answer') return;
  const now = performance.now();
  const rt = now - ph.tAnswer;
  const result = judge(trial, answer);
  const actualMs = ph.tMask - ph.stamps[0];
  let dropped = false;
  const seq = [...ph.stamps, ph.tMask];
  for (let i = 1; i < seq.length; i++) if (seq[i] - seq[i - 1] > timing.frameMs * TIMING.dropFactor) dropped = true;

  const before = flash;
  const { state, stageChange } = applyResult(flash, trial, result, profile, { skipStair: dropped });
  flash = state;
  save.flash[profile.id] = flash;
  run = applyFlash(run, result.success);

  lastLog = {
    kind: 'flash',
    at: new Date().toISOString(),
    profile: profile.id,
    stage: trial.stage,
    focus: trial.focus,
    theme: trial.theme,
    emblem: EMBLEMS[trial.emblem],
    target: trial.target,
    distractors: trial.distractors.length,
    answer: { emblem: EMBLEMS[answer.emblem], dir: answer.dir },
    ...result,
    durationLevel: trial.durationLevel,
    intendedMs: +trial.intendedMs.toFixed(1),
    frames: trial.frames,
    actualMs: +actualMs.toFixed(1),
    dropped,
    hz: timing.hz,
    rtMs: Math.round(rt), // 記録のみ。判定には使わない
    levels: { duration: before.stairs.duration.level, ecc: before.stairs.ecc.level, distract: before.stairs.distract.level },
  };
  pushLog(save, lastLog);
  writeSave(storage, save);

  if (result.success) {
    sfx.sfxSuccess(Math.min(8, run.flashOk));
    callout(trial.target ? '宝箱を見つけた' : '扉が開いた', 'good');
  } else {
    sfx.sfxTrap();
    if (result.dirOk === false) sfx.sfxMimic();
    callout(result.dirOk === false && result.emblemOk ? 'ミミックだ！' : '罠だ！', 'bad');
    hurtLantern();
  }
  if (stageChange) {
    sfx.sfxStage(stageChange > 0);
    const [t, s] = STAGE_TEXT[flash.stage];
    banner(stageChange > 0 ? `${t} へ` : `${t} にもどる`, s);
  }
  pad.hide();
  updateHud();
  // 段階が変わったときは、説明を読めるよう少し長く間をとる
  const fbMs = (result.success ? FEEDBACK_MS.success : FEEDBACK_MS.fail) + (stageChange ? 1600 : 0);
  view.startFeedback(trial, answer, result, now, fbMs);
  phase = 'feedback';
  updateDebug();
}

// ---------- 祭壇 ----------
function onAltarChoose(id, { lamp }) {
  if (phase !== 'altar') return;
  const r = applyAltar(run, id, { lamp });
  run = r.run;
  if (!lamp) {
    altarStair = updateStaircase(altarStair, r.ok);
    save.altar[profile.id] = altarStair;
  }
  pushLog(save, { kind: 'altar', at: new Date().toISOString(), profile: profile.id, index: r.index, target: run.items[r.index].id, chosen: id, ok: r.ok, lamp, level: ph.altarLevel, rtMs: Math.round(performance.now() - ph.tAltar) });
  writeSave(storage, save);
  if (r.ok) sfx.sfxRecall();
  else { sfx.sfxMimic(); sfx.sfxTrap(); hurtLantern(); }
  updateHud();
  altarView.reveal({ ok: r.ok, run, index: r.index, chosenId: id });
  updateDebug();
}

function onAltarLamp() {
  run = useLamp(run);
  altarView.setRun(run);
  altarView.peek(PEEK_MS);
  sfx.sfxOil();
  updateHud();
}

// ---------- 精算 ----------
function endRun() {
  phase = 'menu';
  hideStages();
  const result = settle(run);
  save.meta.gold += result.total;
  const st = statsFor(save, profile.id);
  save.stats[profile.id] = {
    runs: st.runs + 1,
    items: st.items + result.correct,
    bestItems: Math.max(st.bestItems, result.correct),
    completed: st.completed + result.reqs.filter((r) => r.complete).length,
  };
  const prev = recommended();
  const rec = nextRecommended(prev, result, capacity(save.meta.rooms));
  save.recommend[profile.id] = rec;
  writeSave(storage, save);
  sfx.sfxEnd();
  renderResult($('result'), { result, run, gold: save.meta.gold, recommended: rec, prevRecommended: prev });
  showScreen('result');
  updateDebug();
}

// ---------- フレーム単位の進行 ----------
let frozen = false; // テスト用：描画を止めて閃光やマスクを撮る
function loop(ts) {
  requestAnimationFrame(loop);
  if (frozen) return;
  switch (phase) {
    case 'boot':
    case 'menu':
    case 'store':
    case 'altar':
      view.drawDark(ts, { dark: 0, fixation: false });
      break;
    case 'fixation':
      if (ph.tFix == null) ph.tFix = ts;
      if (ts - ph.tFix >= trial.fixationMs) {
        // この描画が次の画面更新で表示される。以後 frames 回の更新のあとにマスクを描く
        view.drawStim();
        ph.stamps = [ts];
        phase = 'stim';
      } else {
        view.drawDark(ts, { dark: darkness(flash) });
      }
      break;
    case 'stim':
      if (ph.stamps.length >= trial.frames) {
        view.drawMask();
        ph.tMask = ts;
        phase = 'mask';
      } else {
        ph.stamps.push(ts);
      }
      break;
    case 'mask':
      if (ts - ph.tMask >= profile.flash.maskMs) {
        phase = 'answer';
        ph.tAnswer = performance.now();
        view.drawAnswerBg(ts, darkness(flash));
        $('banner').hidden = true; // 回答ボタンに重ならないように
        pad.show(trial.stage);
      }
      break;
    case 'answer':
      view.drawAnswerBg(ts, darkness(flash));
      break;
    case 'feedback':
      if (view.drawFeedback(ts)) enterRoom();
      break;
  }
}

// ---------- 入力 ----------
document.addEventListener('keydown', (e) => {
  if (pad.handleKey(e)) { e.preventDefault(); return; }
  if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && phase === 'menu' && !$('title').hidden) {
    e.preventDefault();
    openBoard();
  }
  if (e.code === 'Escape' && run && phase !== 'menu') quit();
});

document.addEventListener('visibilitychange', () => { if (document.hidden) restartTrial(); });
window.addEventListener('resize', restartTrial);

function quit() {
  if (confirm('このランをやめてタイトルにもどりますか？（金貨はもらえません）')) toTitle();
}

$('startBtn').onclick = openBoard;
$('againBtn').onclick = openBoard;
$('shopBtn').onclick = () => openShop('title');
$('resShopBtn').onclick = () => openShop('result');
$('toTitleBtn').onclick = toTitle;
$('howBtn').onclick = () => showScreen('howto');
$('setBtn').onclick = () => { refreshSettings(); showScreen('settings'); };
$('quitBtn').onclick = quit;
document.querySelectorAll('.back').forEach((b) => (b.onclick = toTitle));

// ---------- せってい ----------
function refreshSettings() {
  document.querySelectorAll('#profileSeg button').forEach((b) => b.classList.toggle('on', b.dataset.profile === profile.id));
  document.querySelectorAll('#soundSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.sound === '1') === save.sound));
}
document.querySelectorAll('#profileSeg button').forEach((b) => (b.onclick = () => {
  save.profile = b.dataset.profile;
  profile = PROFILES[save.profile];
  writeSave(storage, save);
  refreshSettings();
}));
document.querySelectorAll('#soundSeg button').forEach((b) => (b.onclick = () => {
  save.sound = b.dataset.sound === '1';
  sfx.setSound(save.sound);
  if (save.sound) { sfx.unlockAudio(); sfx.sfxTap(); }
  writeSave(storage, save);
  refreshSettings();
}));

function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

$('exportBtn').onclick = () => {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  download(`mnemo-manor-${stamp}.json`, exportJson(save));
  $('setMsg').textContent = '書き出しました。';
};
$('importInput').onchange = async (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  try {
    save = importJson(await f.text());
    profile = PROFILES[save.profile];
    sfx.setSound(save.sound);
    writeSave(storage, save);
    refreshSettings();
    $('setMsg').textContent = '読みこみました。';
  } catch (err) {
    $('setMsg').textContent = `読みこめませんでした：${err.message}`;
  }
  e.target.value = '';
};
$('resetBtn').onclick = () => {
  if (!confirm('腕前・金貨・館の記録をすべて消しますか？')) return;
  save = defaultSave();
  profile = PROFILES[save.profile];
  writeSave(storage, save);
  refreshSettings();
  $('setMsg').textContent = '消しました。';
};

// ---------- テスト用（?debug） ----------
function updateDebug() {
  if (!DEBUG || !flash) return;
  const s = flash.stairs;
  const L = lastLog;
  $('debugText').textContent = [
    `${timing.hz}Hz (${timing.frameMs.toFixed(2)}ms/frame)  profile=${profile.id}  stage=${flash.stage}  trials=${flash.trials}`,
    `duration lv ${s.duration.level}/${s.duration.max} = ${durationMs(s.duration.level, profile.flash).toFixed(0)}ms  ecc lv ${s.ecc.level}  distract lv ${s.distract.level}  altar lv ${altarStair ? altarStair.level : '-'}`,
    L ? `last flash: focus=${L.focus} ${L.success ? 'OK' : 'NG'} intended=${L.intendedMs}ms frames=${L.frames} actual=${L.actualMs}ms${L.dropped ? ' DROPPED' : ''} rt=${L.rtMs}ms` : 'last flash: -',
  ].join('\n');
}
if (DEBUG) {
  $('debug').hidden = false;
  document.querySelectorAll('#debug [data-stage]').forEach((b) => (b.onclick = () => {
    flash = normalizeFlashState(save.flash[profile.id], profile, timing.frameMs);
    flash = { ...flash, stage: Number(b.dataset.stage), stageHistory: [] };
    save.flash[profile.id] = flash;
    writeSave(storage, save);
    updateDebug();
  }));
  $('dbgLog').onclick = () => download('mnemo-manor-log.json', JSON.stringify(save.log, null, 1));
  // 自動テスト・画面確認用
  window.__mm = {
    view, boardView, storeView,
    get phase() { return phase; }, get trial() { return trial; }, get flash() { return flash; }, get run() { return run; }, get save() { return save; },
    freeze: (v) => { frozen = v; },
  };
}

// ---------- 起動 ----------
(async function boot() {
  showScreen('measure');
  requestAnimationFrame(loop);
  timing = await measureRefresh();
  flash = normalizeFlashState(save.flash[profile.id], profile, timing.frameMs);
  updateDebug();
  toTitle();
})();
