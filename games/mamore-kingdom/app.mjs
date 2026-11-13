// まもれ！キングダム：がめんの きりかえと そうさ
import * as C from './core.mjs';
import { Renderer, iconCanvas } from './draw.mjs';
import { Sound } from './audio.mjs';

const { TOWERS, TOWER_IDS, HEROES, HERO_IDS, STAGES, DIFFS, ENEMIES } = C;
const $ = id => document.getElementById(id);
const SAVE_KEY = 'mamore-kingdom-v1';
const STEP = 1 / 30;

let meta = C.loadMeta((() => { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } })());
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch { /* ほぞん できなくても あそべる */ } };
const snd = new Sound(meta.sound);
const R = new Renderer($('field'));

let g = null, speed = 1, paused = false, acc = 0, lastT = 0, shopCat = 'tower', barKey = '', hudKey = '', resultShown = false, last = { stage: 'meadow', diff: 'normal', endless: false };
const ui = { build: null, selTower: null, heroSel: false, aimMode: false, ghost: null, aim: null, pointer: null, castleLv: 0 };
let hintStep = 0, hintT = 0;

// ───────── きょうつう ─────────
const screens = ['title', 'town', 'stages', 'battle'];
function show(id) {
  for (const s of screens) $(s).hidden = s !== id;
  snd.setMusic(id === 'battle' ? 'battle' : id === 'title' ? null : 'town');
  if (id === 'battle') requestAnimationFrame(() => R.resize());
}
let toastT = 0;
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1800);
}
function modal(html) { $('sheet').innerHTML = html; $('modal').hidden = false; return $('sheet'); }
function closeModal() { $('modal').hidden = true; }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const pipsHtml = (lv, max) => `<span class="pips">${'●'.repeat(lv)}${'○'.repeat(Math.max(0, max - lv))}</span>`;
document.addEventListener('pointerdown', () => snd.unlock(), { passive: true });
document.addEventListener('contextmenu', e => e.preventDefault());

// ───────── タイトル ─────────
$('titleArt').append(iconCanvas('tower', 'archer', 84), iconCanvas('tower', 'mage', 84, { lv: 3 }), iconCanvas('castle', '', 150, { lv: 3 }), iconCanvas('tower', 'cannon', 84), iconCanvas('enemy', 'goblin', 72));
$('playBtn').onclick = () => { snd.unlock(); snd.play('tap'); openTown(); };

// ───────── まち（おみせ） ─────────
function openTown() { show('town'); renderTown(); }
function renderTown() {
  $('gems').textContent = meta.gems;
  const lv = C.castleLevel(meta);
  $('castleArt').replaceChildren(iconCanvas('castle', '', 210, { lv }));
  $('castleMsg').textContent = meta.runs === 0 ? 'まものが おしろを ねらっている！ まずは しゅつげき しよう。'
    : ['小さな おしろ。ほう石で 大きく しよう！', 'おしろに とうが たった！', 'かべが りっぱに なった！', '金色に かがやく おしろ！', 'だれもが あこがれる 大王国！'][lv];
  for (const b of $('shopTabs').children) b.setAttribute('aria-pressed', String(b.dataset.cat === shopCat));
  const list = $('shop'); list.replaceChildren();
  for (const it of C.shopItems(meta).filter(i => i.cat === shopCat)) {
    const card = el('div', 'item' + (it.kind === 'unlock' ? ' locked' : '') + (it.cost == null ? ' maxed' : ''));
    const ic = el('div', 'item-icon');
    if (it.cat === 'castle') ic.textContent = it.icon; else ic.append(iconCanvas(it.cat, it.ref, 60, { lv: it.cat === 'tower' ? Math.min(3, 1 + Math.floor(it.lv / 2)) : 1 }));
    const body = el('div', 'item-body', `<b>${it.name}</b>${it.kind === 'unlock' ? '<span class="tag">あたらしい なかま</span>' : pipsHtml(it.lv - (it.cat === 'hero' ? 1 : 0), it.max - (it.cat === 'hero' ? 1 : 0))}<p>${it.desc}</p>`);
    const btn = el('button', 'buy' + (it.can ? '' : ' off'), it.cost == null ? 'さいこう！' : `${it.kind === 'unlock' ? '買う' : '強化'}<span>💎${it.cost}</span>`);
    btn.disabled = it.cost == null;
    btn.onclick = () => {
      if (!it.can) { snd.play('no'); toast(`ほう石が あと ${it.cost - meta.gems}こ いるよ`); return; }
      C.buy(meta, it.id); save(); snd.play('buy');
      toast(it.kind === 'unlock' ? `${it.name} が なかまに なった！` : `${it.name} が 強く なった！`);
      renderTown();
    };
    card.append(ic, body, btn); list.append(card);
  }
}
$('shopTabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; shopCat = b.dataset.cat; snd.play('tap'); renderTown(); };
$('goBtn').onclick = () => { snd.play('tap'); show('stages'); renderStages(); };
$('setBtn').onclick = () => settings();
function settings() {
  const s = modal(`<h3>せってい</h3>
    <button class="row-btn" id="mSound">🔊 音：${meta.sound ? 'あり' : 'なし'}</button>
    <a class="row-btn" href="../../">← ゲームいちらんへ</a>
    <button class="row-btn danger" id="mReset">データを はじめから に する</button>
    <button class="row-btn main" id="mClose">とじる</button>`);
  s.querySelector('#mSound').onclick = () => { meta.sound = !meta.sound; snd.setOn(meta.sound); save(); settings(); };
  s.querySelector('#mClose').onclick = closeModal;
  s.querySelector('#mReset').onclick = () => {
    const q = modal(`<h3>ほんとうに けす？</h3><p>ほう石も 買ったものも ぜんぶ なくなるよ。</p>
      <button class="row-btn danger" id="mYes">ぜんぶ けす</button><button class="row-btn main" id="mNo">やめる</button>`);
    q.querySelector('#mNo').onclick = closeModal;
    q.querySelector('#mYes').onclick = () => { const so = meta.sound; meta = C.newMeta(); meta.sound = so; save(); closeModal(); renderTown(); };
  };
}

// ───────── ステージえらび ─────────
function renderStages() {
  $('gems2').textContent = meta.gems;
  const list = $('stageList'); list.replaceChildren();
  STAGES.forEach((st, si) => {
    const open = C.stageOpen(meta, si);
    const card = el('div', `stage ${st.id}` + (open ? '' : ' closed'));
    card.append(el('div', 'stage-head', `<span class="stage-icon">${open ? st.icon : '🔒'}</span><b>${st.name}</b><small>${open ? `ぜんぶで ${st.waves}この 波` : `「${STAGES[si - 1].name}」を クリアすると 開く`}</small>`));
    if (open) card.append(stageMap(st), el('div', 'stage-boss', `ボス：${ENEMIES[st.boss].name}`));
    const row = el('div', 'diffs');
    DIFFS.forEach((d, di) => {
      const ok = C.diffOpen(meta, si, di), done = meta.clears[C.clearKey(st.id, d.id)];
      const b = el('button', 'diff' + (ok ? '' : ' off') + (done ? ' done' : ''), `${done ? '👑' : ok ? '' : '🔒'} ${d.name}<small>💎×${d.gem}</small>`);
      b.onclick = () => { if (!ok) { snd.play('no'); toast(di ? `「${DIFFS[di - 1].name}」を クリアすると あそべるよ` : 'まだ あそべないよ'); return; } startBattle(st.id, d.id, false); };
      row.append(b);
    });
    const eo = C.endlessOpen(meta, si), best = meta.best[st.id + ':endless'] || 0;
    const eb = el('button', 'diff endless' + (eo ? '' : ' off'), `${eo ? '♾️' : '🔒'} はてしない${best ? `<small>きろく ${best}波</small>` : '<small>どこまで いける？</small>'}`);
    eb.onclick = () => { if (!eo) { snd.play('no'); toast('「ふつう」を クリアすると あそべるよ'); return; } startBattle(st.id, 'normal', true); };
    row.append(eb);
    card.append(row); list.append(card);
  });
  const hp = $('heroPick'); hp.replaceChildren();
  for (const id of HERO_IDS) {
    if (!meta.heroes[id]) continue;
    const b = el('button', 'hero-btn' + (meta.hero === id ? ' on' : ''));
    b.append(iconCanvas('hero', id, 46), el('span', '', `${HEROES[id].short}<small>Lv${meta.heroes[id]}</small>`));
    b.onclick = () => { meta.hero = id; save(); snd.play('tap'); renderStages(); };
    hp.append(b);
  }
}
// ステージの 小さな 地図
const MAP_COL = { meadow: ['#7ecb6b', '#e3c98f'], snow: ['#e6f1fa', '#9fb0c4'], volcano: ['#5b4239', '#a39a93'] };
function stageMap(st) {
  const cv2 = document.createElement('canvas'), c = cv2.getContext('2d'), [ground, road] = MAP_COL[st.id];
  cv2.width = 384; cv2.height = 216; cv2.className = 'stage-map';
  c.fillStyle = ground; c.fillRect(0, 0, 384, 216); c.scale(0.4, 0.4);
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const [w, col] of [[54, 'rgba(0,0,0,.25)'], [42, road]]) for (const pts of st.paths) {
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  }
  c.font = '70px serif'; c.textAlign = 'center'; c.fillText('🏰', st.castle[0], st.castle[1] + 20);
  return cv2;
}
$('stagesBack').onclick = () => { snd.play('tap'); openTown(); };

// ───────── バトル ─────────
function startBattle(stageId, diffId, endless) {
  last = { stage: stageId, diff: diffId, endless };
  g = C.createBattle(meta, stageId, diffId, endless);
  Object.assign(ui, { build: null, selTower: null, heroSel: false, aimMode: false, ghost: null, aim: null, pointer: null, castleLv: C.castleLevel(meta) });
  speed = 1; paused = false; acc = 0; resultShown = false; barKey = ''; hudKey = '';
  hintStep = meta.hint ? 9 : 0; hintT = 0;
  $('speedBtn').textContent = '▶ ×1'; $('autoBtn').setAttribute('aria-pressed', 'false');
  const k = g.hero.s.skill; $('skillIcon').textContent = HEROES[g.hero.type].icon; $('skillName').textContent = k.name;
  $('banner').hidden = true;
  closeModal(); show('battle'); R.setStage(g.stage); R.resize();
  snd.play('wave');
  banner(`${g.stage.name}${endless ? '（はてしない）' : ''}`, 'タワーを おいて おしろを 守ろう！');
}
let bannerT = 0;
function banner(main, sub = '', cls = '') {
  const b = $('banner'); b.className = cls; b.innerHTML = `<b>${main}</b>${sub ? `<span>${sub}</span>` : ''}`; b.hidden = false;
  clearTimeout(bannerT); bannerT = setTimeout(() => { b.hidden = true; }, 2200);
}
const statLine = (type, s) => type === 'barracks' ? `へいし ${s.n}人・たいりょく ${s.hp}・こうげき ${s.dmg}`
  : type === 'ice' ? `のろさ ${Math.round(s.slow * 100)}%・はんい ${s.range}`
    : `こうげき ${s.dmg}・1びょうに ${(1 / s.rate).toFixed(1)}回・はんい ${s.range}`;

function renderBar() {
  const bar = $('bar');
  let key;
  if (ui.selTower) { const t = ui.selTower, c = C.upgradeCost(t); key = `t${t.id}:${t.lv}:${c != null && g.gold >= c}`; }
  else if (ui.heroSel) key = 'hero';
  else key = 'b' + (ui.build || '') + TOWER_IDS.map(id => (g.gold >= TOWERS[id].cost ? 1 : 0)).join('');
  if (key === barKey) return;
  barKey = key; bar.replaceChildren();
  if (ui.selTower) {
    const t = ui.selTower, T = TOWERS[t.type], s = C.towerStats(t.type, t.lv, t.branch, g.pow[t.type]), cost = C.upgradeCost(t);
    const box = el('div', 'info');
    const head = el('div', 'info-head'); head.append(iconCanvas('tower', t.type, 52, { lv: t.lv, branch: t.branch }));
    head.append(el('div', '', `<b>${t.branch ? T[t.branch].name : T.name}</b> <span class="lv">Lv${t.lv}</span><p>${statLine(t.type, s)}</p>`));
    box.append(head);
    const acts = el('div', 'info-acts');
    const upBtn = (branch, label, sub) => {
      const b = el('button', 'act up' + (g.gold >= cost ? '' : ' off'), `<b>${label}</b><small>${sub}</small><span>💰${cost}</span>`);
      b.onclick = () => { if (C.upgradeTower(g, t, branch)) { barKey = ''; } else { snd.play('no'); toast(`ゴールドが あと ${cost - g.gold} いるよ`); } };
      acts.append(b);
    };
    if (cost == null) acts.append(el('div', 'act maxed', '<b>⭐ さいこう レベル！</b>'));
    else if (t.lv === 3) { upBtn('a', `✨進化：${T.a.name}`, T.a.desc); upBtn('b', `✨進化：${T.b.name}`, T.b.desc); }
    else upBtn(t.branch, '⬆ 強化', statLine(t.type, C.towerStats(t.type, t.lv + 1, t.branch, g.pow[t.type])));
    const sell = el('button', 'act sell', `<b>売る</b><span>💰+${C.sellValue(t)}</span>`);
    sell.onclick = () => { C.sellTower(g, t); ui.selTower = null; };
    const close = el('button', 'act close', '✕'); close.onclick = () => { ui.selTower = null; };
    acts.append(sell, close); box.append(acts); bar.append(box);
  } else if (ui.heroSel) {
    const h = g.hero, H = HEROES[h.type], box = el('div', 'info');
    const head = el('div', 'info-head'); head.append(iconCanvas('hero', h.type, 52));
    head.append(el('div', '', `<b>${H.name}</b><p>👉 行きたい 場所を タップしてね</p><p>わざ「${H.skill.name}」：${H.skill.desc}</p>`));
    const close = el('button', 'act close', '✕'); close.onclick = () => { ui.heroSel = false; };
    const acts = el('div', 'info-acts'); acts.append(close); box.append(head, acts); bar.append(box);
  } else {
    for (const id of TOWER_IDS) {
      const T = TOWERS[id], own = g.unlocked[id];
      const b = el('button', 'tw' + (own ? '' : ' lock') + (ui.build === id ? ' on' : '') + (own && g.gold < T.cost ? ' poor' : ''));
      b.append(iconCanvas('tower', id, 46), el('b', '', T.name), el('span', '', own ? `💰${T.cost}` : '🔒 まちで 買える'));
      b.onclick = () => {
        if (!own) { snd.play('no'); toast(`${T.name} は まちの おみせで 買えるよ（💎${T.unlock}）`); return; }
        if (g.gold < T.cost) { snd.play('no'); toast(`ゴールドが あと ${T.cost - g.gold} いるよ`); return; }
        snd.play('tap'); ui.build = ui.build === id ? null : id; ui.ghost = null; ui.heroSel = false; ui.aimMode = false;
        if (hintStep === 0) hintStep = 1;
      };
      bar.append(b);
    }
  }
}

function renderHud() {
  const total = g.endless ? '' : `/${g.stage.waves}`;
  const key = `${g.gold}|${g.lives}|${g.wave}|${g.waveActive}|${g.over}|${Math.ceil(g.hero.skillCd)}|${g.hero.downT > 0}|${ui.aimMode}`;
  if (key === hudKey) return;
  hudKey = key;
  $('gold').textContent = g.gold; $('lives').textContent = g.lives; $('waveNo').textContent = `${Math.max(1, g.wave)}${total}`;
  const wb = $('waveBtn'), idle = !g.waveActive && !g.over && g.wave < C.waveCount(g);
  wb.hidden = !idle; $('nextInfo').hidden = !idle;
  if (idle) {
    wb.innerHTML = g.wave === 0 ? '▶ スタート' : `▶ 波 ${g.wave + 1}`;
    const ni = $('nextInfo'); ni.replaceChildren(el('span', '', '次の てき'));
    const sum = {};
    for (const grp of C.waveSpec(g.si, g.wave, g.endless)) sum[grp.type] = (sum[grp.type] || 0) + grp.count;
    for (const [type, n] of Object.entries(sum)) { const d = el('div', 'nx' + (ENEMIES[type].boss ? ' boss' : '')); d.append(iconCanvas('enemy', type, 30), el('b', '', ENEMIES[type].boss ? 'ボス' : `×${n}`)); ni.append(d); }
  }
  const h = g.hero, sb = $('skillBtn'), ready = h.skillCd <= 0 && h.downT <= 0;
  sb.classList.toggle('ready', ready); sb.classList.toggle('aim', ui.aimMode);
  $('skillCd').textContent = ready ? '' : h.downT > 0 ? '💤' : Math.ceil(h.skillCd);
}

function hint() {
  const hEl = $('hint');
  let msg = '';
  if (hintStep === 0) msg = '👇 下の タワーを タップして えらぼう';
  else if (hintStep === 1) msg = '👆 道の そばを タップして タワーを おこう';
  else if (hintStep === 2) msg = 'もっと おいても いいよ。じゅんびが できたら「▶ スタート」！';
  else if (hintStep === 3) msg = 'おいた タワーを タップすると、ゴールドで 強化 できるよ';
  else if (hintStep === 4) msg = 'ヒーローを タップ → 道を タップで いどう。⭐ボタンで わざが 出るよ';
  if (hintStep >= 3 && hintStep < 9) { hintT += 1 / 60; if (hintT > 7) { hintStep++; hintT = 0; if (hintStep > 4) { hintStep = 9; meta.hint = 1; save(); } } }
  if (hEl.textContent !== msg) hEl.textContent = msg;
  hEl.hidden = !msg || !!g.over;
}

function handleEvents() {
  if (!g.events.length) return;
  R.feed(g.events);
  for (const e of g.events) {
    switch (e.t) {
      case 'shot': snd.play(e.kind === 'cannon' ? 'cannon' : 'arrow', 0.05); break;
      case 'boom': snd.play('boom', 0.08); break;
      case 'bolt': snd.play(e.kind === 'zap' ? 'zap' : 'magic', 0.06); break;
      case 'pulse': snd.play('ice', 0.2); break;
      case 'slash': snd.play('slash', 0.08); break;
      case 'die': snd.play(e.boss ? 'bossDie' : 'pop', 0.04); if (e.boss) banner('ボスを たおした！', `💰+${e.gold}`, 'good'); break;
      case 'place': snd.play('place'); if (hintStep <= 1) hintStep = 2; break;
      case 'sell': snd.play('sell'); break;
      case 'upgrade': snd.play(e.evolve ? 'evolve' : 'upgrade'); if (e.evolve) banner('✨ 進化した！', '', 'good'); break;
      case 'leak': snd.play('leak', 0.15); break;
      case 'wave': snd.play(e.boss ? 'bossIn' : 'wave'); if (e.boss) banner('⚠️ ボスが 来る！', '力を あわせて たおそう', 'warn'); else if (e.n > 1) banner(`波 ${e.n}`); if (hintStep < 3) hintStep = 3; break;
      case 'waveClear': snd.play('clear'); if (!g.over) banner(`波 ${e.n} クリア！`, `ボーナス 💰+${e.bonus}`, 'good'); break;
      case 'aura': snd.play('boom'); if (e.any) banner(e.kind === 'fire' ? '🔥 タワーが もやされた！' : '🧊 タワーが こおった！', 'しばらく うごけない', 'warn'); break;
      case 'skill': snd.play(e.id === 'meteor' ? 'meteor' : 'skill'); break;
      case 'heroDown': snd.play('down'); toast(`${HEROES[g.hero.type].short} が ひとやすみ…すぐ もどるよ`); break;
      case 'heroUp': snd.play('upgrade'); break;
    }
  }
  g.events.length = 0;
}

function finish() {
  if (resultShown) return;
  resultShown = true;
  const win = g.over === 'win', res = C.applyResult(meta, g);
  if (!meta.hint) meta.hint = 1;
  save();
  snd.setMusic(null); snd.play(win ? 'win' : g.over === 'lose' ? 'lose' : 'clear');
  const head = win ? '🎉 大しょうり！' : g.over === 'lose' ? 'おしろが やぶられた…' : 'ここまでに する';
  const sub = win ? 'おしろを 守りきった！' : g.cleared ? `でも ${g.cleared}この 波を のりきったよ！` : 'まちで 強く なって、もう一回！';
  const s = modal(`<h3 class="${win ? 'win' : ''}">${head}</h3><p>${sub}</p>
    <div class="reward"><span>もらった ほう石</span><b>💎<i id="rGem">0</i></b>${res.first ? `<em>はじめて クリア ボーナス +${res.bonus}</em>` : ''}${res.newBest && g.endless ? `<em>しん きろく！ ${res.waves}波</em>` : ''}</div>
    <p class="have">いま もっている ほう石：💎${meta.gems}</p>
    <button class="row-btn main" id="rTown">🏰 まちで 買いもの</button>
    <button class="row-btn" id="rAgain">🔁 もう一回</button>`);
  let v = 0; const tgt = res.total, stepN = Math.max(1, Math.ceil(tgt / 40));
  const iv = setInterval(() => { v = Math.min(tgt, v + stepN); const o = s.querySelector('#rGem'); if (!o) { clearInterval(iv); return; } o.textContent = v; snd.play('gem', 0.05); if (v >= tgt) clearInterval(iv); }, 30);
  s.querySelector('#rTown').onclick = () => { closeModal(); g = null; openTown(); };
  s.querySelector('#rAgain').onclick = () => startBattle(last.stage, last.diff, last.endless);
}

function pause() {
  if (!g || g.over) return;
  paused = true;
  const s = modal(`<h3>ひとやすみ</h3>
    <button class="row-btn main" id="pGo">▶ つづける</button>
    <button class="row-btn" id="pSound">🔊 音：${meta.sound ? 'あり' : 'なし'}</button>
    <button class="row-btn" id="pQuit">🏰 やめて まちへ（ほう石は もらえる）</button>`);
  s.querySelector('#pGo').onclick = () => { paused = false; closeModal(); };
  s.querySelector('#pSound').onclick = () => { meta.sound = !meta.sound; snd.setOn(meta.sound); save(); pause(); };
  s.querySelector('#pQuit').onclick = () => { paused = false; g.over = 'quit'; finish(); };
}
$('pauseBtn').onclick = pause;
$('speedBtn').onclick = () => { speed = speed % 3 + 1; $('speedBtn').textContent = `${'▶'.repeat(speed)} ×${speed}`; snd.play('tap'); };
$('autoBtn').onclick = () => { g.auto = !g.auto; $('autoBtn').setAttribute('aria-pressed', String(g.auto)); snd.play('tap'); toast(g.auto ? '次の 波が 自動で はじまるよ' : '自動を やめたよ'); };
$('waveBtn').onclick = () => { if (C.startWave(g)) hudKey = ''; };
$('skillBtn').onclick = () => {
  const h = g.hero, k = h.s.skill;
  if (h.downT > 0 || h.skillCd > 0) { snd.play('no'); return; }
  if (k.aim) { ui.aimMode = !ui.aimMode; ui.build = null; ui.heroSel = false; ui.aim = null; if (ui.aimMode) toast(`${k.name} を おとす 場所を タップ！`); }
  else C.useSkill(g);
};

// ───────── そうさ ─────────
const cv = $('field');
function fieldPos(e, lift = false) {
  const r = cv.getBoundingClientRect(), p = R.toField(e.clientX - r.left, e.clientY - r.top);
  if (lift && e.pointerType === 'touch') p.y -= 44;
  return p;
}
function setGhost(e) {
  const p = fieldPos(e, true);
  ui.ghost = { type: ui.build, x: Math.round(p.x), y: Math.round(p.y), ok: C.canPlace(g, ui.build, p.x, p.y) };
}
const REASON = { path: '道の 上には おけないよ', castle: 'おしろの 近くには おけないよ', tower: 'タワーが 近すぎるよ', edge: 'そこには おけないよ', far: 'へいしの 小屋は 道の 近くに おこう' };
let down = false;
cv.addEventListener('pointerdown', e => {
  if (!g || g.over || paused) return;
  down = true; try { cv.setPointerCapture(e.pointerId); } catch { /* なくても うごく */ }
  if (ui.build) setGhost(e);
  else if (ui.aimMode) { const p = fieldPos(e, true); ui.aim = { x: p.x, y: p.y, r: g.hero.s.skill.r }; }
});
cv.addEventListener('pointermove', e => {
  if (!g || g.over) return;
  if (ui.build && (down || e.pointerType === 'mouse')) setGhost(e);
  else if (ui.aimMode && (down || e.pointerType === 'mouse')) { const p = fieldPos(e, true); ui.aim = { x: p.x, y: p.y, r: g.hero.s.skill.r }; }
  else if (ui.heroSel && e.pointerType === 'mouse') ui.pointer = fieldPos(e);
});
cv.addEventListener('pointerup', e => {
  if (!g || g.over || paused || !down) return;
  down = false;
  if (ui.build) {
    setGhost(e);
    const q = ui.ghost, why = C.placeReason(g, q.type, q.x, q.y);
    if (why) { snd.play('no'); toast(REASON[why] || 'そこには おけないよ'); if (e.pointerType !== 'mouse') ui.ghost = null; return; }
    C.placeTower(g, q.type, q.x, q.y);
    if (g.gold < TOWERS[q.type].cost) ui.build = null;
    ui.ghost = null;
    return;
  }
  if (ui.aimMode) { const p = fieldPos(e, true); C.useSkill(g, p.x, p.y); ui.aimMode = false; ui.aim = null; return; }
  const p = fieldPos(e), h = g.hero;
  if (Math.hypot(p.x - h.x, p.y - (h.y - (h.s.fly ? 30 : 8))) < 30) { ui.heroSel = !ui.heroSel; ui.selTower = null; ui.pointer = null; snd.play('tap'); return; }
  let hit = null, bd = 30;
  for (const t of g.towers) { const d = Math.hypot(p.x - t.x, p.y - (t.y - 8)); if (d < bd) { bd = d; hit = t; } }
  if (hit) { ui.selTower = ui.selTower === hit ? null : hit; ui.heroSel = false; snd.play('tap'); return; }
  if (ui.heroSel) { C.moveHero(g, p.x, p.y); ui.heroSel = false; ui.pointer = null; snd.play('tap'); return; }
  ui.selTower = null;
});
cv.addEventListener('pointercancel', () => { down = false; ui.ghost = null; ui.aim = null; });
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !down) ui.ghost = null; });
window.addEventListener('keydown', e => {
  if (!g || $('battle').hidden) return;
  if (e.key === ' ') { e.preventDefault(); C.startWave(g); hudKey = ''; }
  else if (e.key === 'Escape') { ui.build = null; ui.selTower = null; ui.heroSel = false; ui.aimMode = false; ui.ghost = null; }
  else if (e.key >= '1' && e.key <= '6') { const id = TOWER_IDS[+e.key - 1]; if (g.unlocked[id] && g.gold >= TOWERS[id].cost) ui.build = id; }
});
window.addEventListener('resize', () => R.resize());
window.addEventListener('orientationchange', () => setTimeout(() => R.resize(), 200));
document.addEventListener('visibilitychange', () => { if (document.hidden && g && !g.over && !$('battle').hidden) pause(); });

// ───────── まいフレーム ─────────
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
  snd.tick();
  if (!g || $('battle').hidden) return;
  if (!paused && !g.over) {
    acc += dt * speed;
    let n = 0;
    while (acc >= STEP && n++ < 8) { C.step(g, STEP); acc -= STEP; if (g.over) break; }
    if (ui.selTower && !g.towers.includes(ui.selTower)) ui.selTower = null;
    if (ui.build && g.gold < TOWERS[ui.build].cost) { ui.build = null; ui.ghost = null; }
  }
  handleEvents();
  R.draw(g, ui, ts / 1000, paused ? 0 : dt);
  renderHud(); renderBar(); hint();
  if (g.over && !resultShown) { resultShown = true; setTimeout(() => { resultShown = false; finish(); }, g.over === 'win' ? 1400 : 1000); }
}
requestAnimationFrame(frame);

// かくにん用（テストから のぞく）
window.__mk = { get g() { return g; }, get meta() { return meta; }, set meta(m) { meta = C.loadMeta(m); save(); }, C, ui, startBattle, openTown, setSpeed: v => { speed = v; } };
