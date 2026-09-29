// 画面の切り替え、閃光の進行（フレーム単位）、入力、保存。

import { PROFILES, TIMING, FEEDBACK_MS } from './config/tuning.mjs';
import { createRng } from './core/rng.mjs';
import { makeTrial, judge, applyResult, normalizeFlashState, darkness, durationMs, EMBLEMS } from './core/flash/flash.mjs';
import { createDive, applyDive } from './core/flash/dive.mjs';
import { loadSave, writeSave, pushLog, statsFor, exportJson, importJson, defaultSave } from './core/save/save.mjs';
import { createFlashView, THEME_NAMES } from './render/flash-view.mjs';
import { measureRefresh } from './render/timing.mjs';
import { createAnswerPad } from './ui/answer-pad.mjs';
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

let timing = { frameMs: 1000 / 60, hz: 60 };
let flash = null;       // 閃光の状態（階段法など）
let dive = null;        // 今回の潜行
let trial = null;       // 今の1回
let phase = 'boot';     // boot / title / fixation / stim / mask / answer / feedback / result
let ph = {};            // その回のタイミング記録
let diveStart = null;   // 潜る前の状態（結果画面で比べる）
let lastLog = null;

// ---------- 画面 ----------
const SCREENS = ['measure', 'title', 'howto', 'settings', 'result'];
function showScreen(id) {
  for (const s of SCREENS) $(s).hidden = s !== id;
}

function refreshTitle() {
  const st = statsFor(save, profile.id);
  $('titleStats').textContent = st.dives
    ? `${profile.label}・潜った回数 ${st.dives} ／ 見つけた宝 ${st.treasures} ／ 最長コンボ ${st.bestCombo}`
    : `${profile.label}・はじめての潜行`;
}

function toTitle() {
  phase = 'title';
  pad.hide();
  $('hud').hidden = true;
  refreshTitle();
  showScreen('title');
}

// ---------- HUD ----------
function flameScale(d) { return (1 - d * 0.6).toFixed(3); }

function updateHud() {
  $('roomNo').textContent = `部屋 ${Math.min(dive.room + 1, dive.rooms)} / ${dive.rooms}`;
  $('treasures').textContent = dive.treasures;
  $('combo').textContent = dive.combo >= 2 ? `×${dive.combo}` : '';
  const oil = $('oil');
  if (oil.children.length !== dive.oilMax) {
    oil.innerHTML = '';
    for (let i = 0; i < dive.oilMax; i++) oil.appendChild(document.createElement('i'));
  }
  [...oil.children].forEach((el, i) => el.classList.toggle('off', i >= dive.oil));
  document.querySelector('#hud .lantern').style.setProperty('--flame', flameScale(darkness(flash)));
  $('roomName').textContent = trial ? THEME_NAMES[trial.theme] : '';
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

// ---------- 潜行 ----------
async function startDive() {
  sfx.unlockAudio();
  showScreen('measure');
  phase = 'boot';
  timing = await measureRefresh();
  showScreen(null);
  flash = normalizeFlashState(save.flash[profile.id], profile, timing.frameMs);
  dive = createDive(profile);
  diveStart = { dark: darkness(flash), stage: flash.stage };
  $('hud').hidden = false;
  $('banner').hidden = true;
  const [t, s] = STAGE_TEXT[flash.stage];
  banner(t, s, 2600);
  nextRoom();
}

function pickTheme() {
  if (dive.room < 3) return 'corridor';
  const pool = ['corridor', 'fog', 'storm'];
  if (flash.stage >= profile.flash.reflectionFromStage) pool.push('lake');
  return rng.pick(pool);
}

function nextRoom() {
  trial = makeTrial(flash, profile, rng, { frameMs: timing.frameMs, theme: pickTheme() });
  view.prepare(trial);
  pad.hide();
  phase = 'fixation';
  ph = {};
  updateHud();
}

// 閃光の途中で画面が隠れた・大きさが変わったときは、その回をやり直す（採点しない）
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
  const { dive: nd, events } = applyDive(dive, result);
  dive = nd;

  lastLog = {
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

  // 演出
  if (result.success) {
    sfx.sfxSuccess(dive.combo);
    callout(dive.combo >= 3 ? `見抜いた ×${dive.combo}` : '見抜いた', 'good');
    const c = $('combo');
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  } else {
    sfx.sfxTrap();
    if (result.dirOk === false) sfx.sfxMimic();
    callout(result.dirOk === false && result.emblemOk ? 'ミミックだ！' : '罠だ！', 'bad');
    const l = document.querySelector('#hud .lantern');
    l.classList.remove('hurt'); void l.offsetWidth; l.classList.add('hurt');
  }
  if (events.oilGained) {
    setTimeout(() => {
      sfx.sfxOil();
      const el = $('oil').children[dive.oil - 1];
      if (el) { el.classList.remove('gain'); void el.offsetWidth; el.classList.add('gain'); }
    }, 350);
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

function afterFeedback() {
  if (dive.over) endDive();
  else nextRoom();
}

function endDive() {
  phase = 'result';
  pad.hide();
  $('hud').hidden = true;
  const st = statsFor(save, profile.id);
  save.stats[profile.id] = {
    dives: st.dives + 1,
    treasures: st.treasures + dive.treasures,
    bestCombo: Math.max(st.bestCombo, dive.bestCombo),
  };
  writeSave(storage, save);
  sfx.sfxEnd();

  $('resReason').textContent = dive.oil <= 0 ? 'ランタン油が尽きた' : 'すべての部屋を抜けた';
  $('resRooms').textContent = `${dive.room}`;
  $('resTreasures').textContent = `${dive.treasures}`;
  $('resCombo').textContent = `${dive.bestCombo}`;
  const lanternSvg = document.querySelector('#hud .lantern svg').outerHTML;
  const after = darkness(flash);
  for (const [id, d] of [['flameBefore', diveStart.dark], ['flameAfter', after]]) {
    $(id).innerHTML = lanternSvg;
    $(id).style.setProperty('--flame', flameScale(d));
  }
  // 数値ではなく、炎の大きさと言葉で伝える
  const diff = after - diveStart.dark;
  let msg;
  if (flash.stage > diveStart.stage) msg = `閃光の段階が ${flash.stage} に上がった。見るべきものが増えていく。`;
  else if (diff > 0.02) msg = '闇が深くなった。前より短い光で見抜けている。';
  else if (diff < -0.02) msg = '今日は少し明るめの部屋で。光の長さは、次の潜行でまた合わせていく。';
  else msg = '闇の深さは変わらず。いまの腕前にちょうどいい暗さ。';
  $('resMsg').textContent = msg;
  showScreen('result');
}

// ---------- フレーム単位の進行 ----------
let frozen = false; // テスト用：描画を止めて閃光やマスクを撮る
function loop(ts) {
  requestAnimationFrame(loop);
  if (frozen) return;
  switch (phase) {
    case 'title':
    case 'result':
    case 'boot':
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
      if (view.drawFeedback(ts)) afterFeedback();
      break;
  }
}

// ---------- 入力 ----------
document.addEventListener('keydown', (e) => {
  if (pad.handleKey(e)) { e.preventDefault(); return; }
  if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
    if (phase === 'title' && !$('title').hidden) { e.preventDefault(); startDive(); }
    else if (phase === 'result') { e.preventDefault(); startDive(); }
  }
  if (e.code === 'Escape' && dive && !['title', 'result', 'boot'].includes(phase)) quit();
});

document.addEventListener('visibilitychange', () => { if (document.hidden) restartTrial(); });
window.addEventListener('resize', restartTrial);

function quit() {
  if (confirm('潜行をやめてタイトルにもどりますか？（腕前の記録は残ります）')) toTitle();
}

$('startBtn').onclick = startDive;
$('againBtn').onclick = startDive;
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
  if (!confirm('腕前や記録をすべて消しますか？')) return;
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
    `duration lv ${s.duration.level}/${s.duration.max} = ${durationMs(s.duration.level, profile.flash).toFixed(0)}ms  ecc lv ${s.ecc.level}  distract lv ${s.distract.level}  stageHist ${flash.stageHistory.map((x) => (x ? 'o' : 'x')).join('')}`,
    L ? `last: focus=${L.focus} ${L.success ? 'OK' : 'NG'} intended=${L.intendedMs}ms frames=${L.frames} actual=${L.actualMs}ms${L.dropped ? ' DROPPED' : ''} rt=${L.rtMs}ms` : 'last: -',
  ].join('\n');
}
if (DEBUG) {
  $('debug').hidden = false;
  document.querySelectorAll('#debug [data-stage]').forEach((b) => (b.onclick = () => {
    if (!flash) return;
    flash = { ...flash, stage: Number(b.dataset.stage), stageHistory: [] };
    save.flash[profile.id] = flash;
    writeSave(storage, save);
    updateDebug();
  }));
  $('dbgLog').onclick = () => download('mnemo-manor-log.json', JSON.stringify(save.log, null, 1));
  // 自動テスト・画面確認用
  window.__mm = { view, get phase() { return phase; }, get trial() { return trial; }, get flash() { return flash; }, get dive() { return dive; }, get save() { return save; }, freeze: (v) => { frozen = v; } };
}

// ---------- 起動 ----------
(async function boot() {
  showScreen('measure');
  requestAnimationFrame(loop);
  timing = await measureRefresh();
  if (DEBUG) {
    flash = normalizeFlashState(save.flash[profile.id], profile, timing.frameMs);
    updateDebug();
  }
  toTitle();
})();
