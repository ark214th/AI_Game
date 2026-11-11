// 画面遷移・入力・保存・固定フレームのループ
import {Game, W, H, DIFFICULTIES, DEFAULT_LEVEL, MAX_POWER, CHARACTERS, STAGES, clamp} from './core.mjs';
import {ATTACKS, BOSSES, SPELL_IDS} from './content.mjs';
import {Renderer} from './render.mjs';
import {Sound} from './audio.mjs';
import {SONGS, TRACK_ORDER} from './songs.mjs';
import {drawCharacter} from './art.mjs';

const $ = id => document.getElementById(id);
const STORE = 'starfall-waltz-2-v1', STEP = 1000 / 60, MAX_CONTINUES = 3;
const num = (v, d, lo, hi) => Number.isFinite(v) ? clamp(v, lo, hi) : d;
const fmt = n => Math.floor(n).toLocaleString('en-US');

// ---------- 保存 ----------
const LEVELS = DIFFICULTIES.map((_, i) => i);
function fresh() { return {v: 1, hi: LEVELS.map(() => 0), history: {}, seen: {}, heard: {title: true}, cleared: {}, diff: DEFAULT_LEVEL, char: 0, sound: true, music: .7, sfx: .7, sens: 1, fx: true}; }
function load() {
  const s = fresh();
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!v || typeof v !== 'object') return s;
    if (Array.isArray(v.hi)) s.hi = LEVELS.map(i => num(v.hi[i], 0, 0, 1e12));
    if (v.history && typeof v.history === 'object') for (const [k, h] of Object.entries(v.history)) {
      const m = /^(\w+):(\d+)$/.exec(k);
      if (m && ATTACKS[m[1]] && h && Number.isFinite(h.a) && Number.isFinite(h.c)) s.history[k] = {a: h.a, c: Math.min(h.c, h.a)};
    }
    for (const key of ['seen', 'heard', 'cleared']) if (v[key] && typeof v[key] === 'object') for (const k of Object.keys(v[key])) if (v[key][k] === true) s[key][k] = true;
    s.diff = LEVELS.includes(v.diff) ? v.diff : DEFAULT_LEVEL; s.char = v.char === 1 ? 1 : 0;
    s.sound = v.sound !== false; s.fx = v.fx !== false;
    s.music = num(v.music, .7, 0, 1); s.sfx = num(v.sfx, .7, 0, 1); s.sens = num(v.sens, 1, .6, 2);
  } catch {}
  return s;
}
let save = load();
function persist() { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch {} }
const histKey = (id, diff) => `${id}:${diff}`;
const hist = (id, diff) => save.history[histKey(id, diff)] || {a: 0, c: 0};

// ---------- 状態 ----------
const canvas = $('field'), renderer = new Renderer(canvas, $('bg'));
renderer.fx = save.fx;
const sound = new Sound({enabled: save.sound, music: save.music, sfx: save.sfx});
let game = null, demo = new Game({mode: 'demo', seed: 20261110}), screen = 'title', fieldCssW = W;
let acc = 0, last = performance.now(), endTimer = 0, endScreen = null, roomTrack = 'title';
const keys = new Set();
let bombQueued = false, touchFocus = false, drag = null, moveX = 0, moveY = 0;
const touches = new Map(); // フィールド上で触れている指（2本目が触れた瞬間にボム）
renderer.history = id => game && game.mode !== 'demo' ? hist(id, game.level) : null;

// ---------- 画面 ----------
const SCREENS = ['title', 'select', 'practice', 'music', 'help', 'settings', 'pause', 'gameover', 'practiceResult', 'ending'];
const MENUS = ['title', 'select', 'practice', 'music', 'help', 'settings'];
function show(name) {
  screen = name;
  for (const s of SCREENS) $(s).hidden = s !== name;
  document.body.dataset.screen = name;
  $('skipBtn').hidden = true;
  if (name !== 'playing') { drag = null; touches.clear(); moveX = moveY = 0; }
  const first = name !== 'playing' && $(name)?.querySelector('.menu button:not([disabled]), .plist button:not([disabled]), button');
  if (first && !matchMedia('(pointer:coarse)').matches) first.focus({preventScroll: true});
}
function activeGame() { return game && !MENUS.includes(screen) ? game : demo; }

function refreshDifficulty() {
  for (const box of document.querySelectorAll('.difficulty')) {
    box.innerHTML = '';
    DIFFICULTIES.forEach((d, i) => {
      const b = document.createElement('button');
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(save.diff === i));
      b.innerHTML = `${d.name}<small>${d.ja}</small>`;
      b.addEventListener('click', () => setDiff(i));
      box.appendChild(b);
    });
  }
  const d = DIFFICULTIES[save.diff];
  $('diffNote').textContent = `${d.name} ── ${d.note}。残機 ${d.lives}・ボム ${d.bombs || 3}${d.continues === Infinity ? '・コンティニュー無制限' : ''}　HI SCORE ${fmt(save.hi[save.diff])}`;
}
function setDiff(i) { save.diff = clamp(i, 0, DIFFICULTIES.length - 1); persist(); sound.sfx('select'); refreshDifficulty(); if (screen === 'practice') buildPractice(); refreshTitle(); }
function setChar(i) { save.char = i; persist(); sound.sfx('select'); buildChars(); }
function refreshTitle() { $('titleHi').textContent = fmt(Math.max(...save.hi)); }
function buildChars() {
  const list = $('charList'); list.innerHTML = '';
  CHARACTERS.forEach((ch, i) => {
    const b = document.createElement('button');
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(save.char === i));
    const stars = LEVELS.filter(l => save.cleared[`${ch.id}:${l}`]).map(l => DIFFICULTIES[l].name[0]).join(' ');
    b.innerHTML = `<canvas width="224" height="264"></canvas><div><div class="nm">${ch.name}<small>${ch.ja}・${ch.title}${stars ? `　CLEAR ${stars}` : ''}</small></div>
      <dl><div><dt>SHOT</dt><dd>${ch.shot}</dd></div><div><dt>BOMB</dt><dd>${ch.bombName} ── ${ch.bombJa}</dd></div></dl><p>${ch.note}</p></div>`;
    const c = b.querySelector('canvas').getContext('2d'); c.scale(2, 2);
    drawCharacter(c, ch.id, 56, 50, 1.25, {t: 40, expr: save.char === i ? 'smile' : 'normal'});
    b.addEventListener('click', () => setChar(i));
    list.appendChild(b);
  });
  const mini = $('practiceChar'); mini.innerHTML = '';
  CHARACTERS.forEach((ch, i) => {
    const b = document.createElement('button'); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(save.char === i));
    b.textContent = ch.ja; b.addEventListener('click', () => setChar(i)); mini.appendChild(b);
  });
}
function buildPractice() {
  const list = $('practiceList'); list.innerHTML = '';
  let n = 0;
  // ステージ順。中ボスのスペルは、そのステージのボスの前に並べる
  STAGES.forEach(st => {
    const groups = [[BOSSES[st.mid.boss], [st.mid.attack], true], [BOSSES[st.boss], BOSSES[st.boss].attacks, false]];
    for (const [b, ids, mid] of groups) {
      const spells = ids.filter(id => ATTACKS[id].spell); if (!spells.length) continue;
      const h = document.createElement('h3'); h.innerHTML = `${b.name}<small${mid ? ' class="mid"' : ''}>${b.ja}・${b.title}${mid ? '（中ボス）' : ''}</small>`; list.appendChild(h);
      for (const id of spells) {
        n++;
        const a = ATTACKS[id], seen = !!save.seen[id], h2 = hist(id, save.diff), btn = document.createElement('button');
        btn.disabled = !seen;
        btn.innerHTML = `<span class="no">No.${String(n).padStart(2, '0')}</span><span class="nm">${seen ? a.name : '？？？？？？'}<small>${seen ? a.ja : 'ゲーム本編で出会うと練習できます'}</small></span><span class="hs">${h2.c}/${h2.a}</span>`;
        btn.addEventListener('click', () => startPractice(id));
        list.appendChild(btn);
      }
    }
  });
}
function buildMusic() {
  const list = $('musicList'); list.innerHTML = '';
  TRACK_ORDER.forEach((id, i) => {
    const s = SONGS[id], heard = true, btn = document.createElement('button');
    btn.disabled = !heard; if (id === roomTrack) btn.setAttribute('aria-current', 'true');
    btn.innerHTML = `<span class="no">${String(i + 1).padStart(2, '0')}</span><span class="nm">${heard ? s.title : '？？？？？？'}<small>${heard ? s.en : 'ゲーム本編で聴くと加わります'}</small></span><span class="hs">${id === roomTrack ? '♪' : ''}</span>`;
    btn.addEventListener('click', () => { roomTrack = id; sound.play(id); buildMusic(); });
    list.appendChild(btn);
  });
  const s = SONGS[roomTrack];
  $('musicNo').textContent = `No.${String(TRACK_ORDER.indexOf(roomTrack) + 1).padStart(2, '0')}　♩=${s.bpm}　${s.bar === 3 ? '3拍子' : '4拍子'}`;
  $('musicTitle').textContent = s.title; $('musicEn').textContent = s.en; $('musicComment').textContent = s.comment;
}
function drawScope() {
  const cv = $('scope'), c = cv.getContext('2d'), w = cv.width, h = cv.height, spec = sound.spectrum(), p = sound.pulse();
  c.clearRect(0, 0, w, h);
  const n = 56, bw = w / n;
  for (let i = 0; i < n; i++) {
    const v = spec ? spec[Math.floor(1 + i * 1.5)] / 255 : 0, bh = Math.max(2, v * v * (h - 24));
    const g = c.createLinearGradient(0, h, 0, h - bh); g.addColorStop(0, '#5b86ff'); g.addColorStop(.6, '#ff79d8'); g.addColorStop(1, '#ffe28a');
    c.fillStyle = g; c.fillRect(i * bw + 1.5, h - bh - 6, bw - 3, bh);
  }
  c.fillStyle = `rgba(255,226,138,${.25 + p * .75})`; c.beginPath(); c.arc(w - 18, 18, 5 + p * 5, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(233,226,255,.7)'; c.font = 'italic 600 15px Georgia,serif'; c.fillText(sound.section ? `section ${sound.section}` : '', 12, 22);
}
function refreshSettings() {
  $('soundToggle').querySelector('b').textContent = save.sound ? 'ON' : 'OFF';
  $('fxToggle').querySelector('b').textContent = save.fx ? 'きれい' : 'かるい';
  $('musicVol').value = save.music; $('sfxVol').value = save.sfx; $('sens').value = save.sens; $('sensOut').textContent = save.sens.toFixed(1);
}

// ---------- 進行 ----------
function beginGame(g) {
  sound.init(); game = g; renderer.reset(); endTimer = 0; acc = 0; bombQueued = false; moveX = moveY = 0;
  $('hudDiff').textContent = DIFFICULTIES[g.level].name;
  const bn = g.char.bomb === 'stop' ? 'PAUSE' : 'NOVA'; $('hudBombName').textContent = bn; $('bombBtnName').textContent = bn;
  show('playing'); sound.sfx('confirm');
}
const newSeed = () => (Date.now() & 0x7fffffff) || 1;
function startStory() { beginGame(new Game({mode: 'story', difficulty: save.diff, character: save.char, seed: newSeed()})); }
function startPractice(id) { beginGame(new Game({mode: 'practice', attack: id, difficulty: save.diff, character: save.char, seed: newSeed()})); }
function toTitle() {
  persist(); sound.resume(); game = null; renderer.reset(); sound.play('title'); refreshTitle(); show('title');
}
function pause() {
  if (screen !== 'playing' || endTimer > 0) return;
  persist();
  show('pause'); sound.sfx('pause'); setTimeout(() => { if (screen === 'pause') sound.pause(); }, 160);
}
function resume() { sound.resume(); show('playing'); }
function retry() { sound.resume(); if (game?.mode === 'practice') startPractice(game.practiceId); else startStory(); }
const continuesLeft = g => (g.rules.continues ?? MAX_CONTINUES) - g.continues;
function continueGame() {
  if (!game || continuesLeft(game) <= 0) return;
  game.continueGame(); sound.resume(); show('playing');
}
const ENDINGS = {
  nova: ['蝕が解けると、月は何事もなかったように空へ戻った。風が鳴り、氷が鳴り、止まっていた海がゆっくりと満ちてくる。',
    '「休符は、音があるから休符なんだよ」<br>ノヴァがそう言うと、歌姫はしばらく黙って──それから初めて、声を出して笑った。',
    '次の夜から、天球の円舞曲には一拍ぶんの静けさが加わった。<br>踊る人はみな、そこでいちど息を吸う。それが彼女の歌だと、今では誰もが知っている。'],
  clem: ['蝕が解けると、月は何事もなかったように空へ戻った。世界中の時計が、いっせいに次の一秒を刻む。',
    '「止まっているのと、休んでいるのは違います。ワタシは両方やったことがあるので、分かります」<br>クレメンタインがそう言うと、歌姫はしばらく黙って──それから初めて、声を出して笑った。',
    '次の夜から、天球の円舞曲には一拍ぶんの静けさが加わった。<br>カチ、コチ、（　）。その空白を、時計仕掛けの踊り子は誰よりも正確に数えている。'],
};
function finishTo(name) {
  persist();
  if (name === 'gameover') {
    const left = continuesLeft(game);
    $('continueBtn').disabled = left <= 0;
    $('continueInfo').textContent = left === Infinity ? '何度でも' : left > 0 ? `あと${left}回` : 'CONTINUE';
    $('goSub').textContent = left > 0 ? 'コンティニューするとスコアは0から' : 'ステップを踏み外してしまった';
    $('goScore').textContent = `SCORE ${fmt(game.score)}`;
  } else if (name === 'practiceResult') {
    const r = game.result || {}, a = ATTACKS[game.practiceId], h = hist(a.id, game.level);
    $('prTitle').innerHTML = `${r.captured ? 'SPELL CAPTURED!' : 'FAILED…'}<small>${r.captured ? 'お見事！' : r.died ? '被弾してしまった' : 'ボーナスを逃した'}</small>`;
    $('prName').textContent = `${a.name}　${a.ja}`;
    $('prHist').textContent = `History ${h.c} / ${h.a}　（${DIFFICULTIES[game.level].name}）`;
  } else if (name === 'ending') {
    $('endText').innerHTML = ENDINGS[game.char.id].map(p => `<p>${p}</p>`).join('');
    $('endStats').innerHTML = [['SCORE', fmt(game.score)], ['DANCER', game.char.name], ['DIFFICULTY', DIFFICULTIES[game.level].name], ['CAPTURED', `${game.captures} / ${SPELL_IDS.length}`],
      ['MISS', game.misses], ['BOMB', game.bombsUsed], ['GUARD', game.guards], ['GRAZE', fmt(game.graze)], ['CONTINUE', game.continues]]
      .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    sound.play('ending'); save.heard.ending = true; persist();
  }
  show(name);
}

function processEvents(g) {
  for (const e of g.events) {
    renderer.handle(e, g);
    switch (e.type) {
      case 'sfx': sound.sfx(e.name); break;
      case 'music': sound.play(e.track); if (!save.heard[e.track]) { save.heard[e.track] = true; persist(); } break;
      case 'hit': sound.sfx('hit'); break;
      case 'death': sound.sfx('death'); break;
      case 'bomb': sound.sfx(e.kind === 'stop' ? 'stop' : 'bomb'); if (e.death) sound.sfx('deathbomb'); break;
      case 'stopEnd': sound.sfx('stopEnd'); break;
      case 'fortissimo': sound.sfx('fortissimo'); break;
      case 'fortEnd': if (!e.broken) sound.sfx('fortEnd'); break;
      case 'guard': sound.sfx('guard'); break;
      case 'movement': sound.sfx('movement'); break;
      case 'spell':
        sound.sfx('spell'); save.seen[e.id] = true;
        { const k = histKey(e.id, g.level), h = save.history[k] || {a: 0, c: 0}; h.a++; save.history[k] = h; }
        persist(); break;
      case 'capture': sound.sfx('capture'); { const h = save.history[histKey(e.id, g.level)]; if (h) h.c = Math.min(h.a, h.c + 1); } persist(); break;
      case 'spellFail': sound.sfx('fail'); break;
      case 'extend': sound.sfx('extend'); break;
      case 'bombGet': case 'powerUp': case 'fullPower': sound.sfx('powerUp'); break;
      case 'enemyDown': sound.sfx('enemyDown'); break;
      case 'bossDown': sound.sfx('bossDown'); break;
      case 'stageClear': persist(); break;
      case 'countdown': sound.sfx(e.s <= 3 ? 'countdownLast' : 'countdown'); break;
      case 'gameover': endTimer = 80; endScreen = 'gameover'; break;
      case 'practiceDone': endTimer = e.died ? 80 : 100; endScreen = 'practiceResult'; break;
      case 'ending': endTimer = 150; endScreen = 'ending'; save.cleared[`${g.char.id}:${g.level}`] = true; persist(); break;
    }
  }
  g.events.length = 0;
  if (g.mode === 'story' && g.score > save.hi[g.level]) { save.hi[g.level] = g.score; }
}

// ---------- 入力 ----------
function isFocus() { return keys.has('ShiftLeft') || keys.has('ShiftRight') || touchFocus; }
function buildInput() {
  let dx = 0, dy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx--;
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx++;
  if (keys.has('ArrowUp') || keys.has('KeyW')) dy--;
  if (keys.has('ArrowDown') || keys.has('KeyS')) dy++;
  const mx = clamp(moveX, -14, 14), my = clamp(moveY, -14, 14);
  moveX -= mx; moveY -= my;
  const bomb = bombQueued; bombQueued = false;
  return {dx, dy, focus: isFocus(), bomb, mx, my};
}
function setTouchFocus(v) { touchFocus = v; $('focusBtn').setAttribute('aria-pressed', String(v)); }
function markTouch() { if (!document.body.classList.contains('touch')) { document.body.classList.add('touch'); layout(); } }

addEventListener('keydown', e => {
  sound.init();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (screen === 'playing') {
    if ((e.code === 'KeyX' || e.code === 'KeyK') && !e.repeat) bombQueued = true;
    if (game?.dialogue && !e.repeat && ['KeyZ', 'Enter', 'Space', 'KeyJ'].includes(e.code)) game.advanceDialogue();
    if (game?.dialogue && (e.code === 'ControlLeft' || e.code === 'ControlRight')) game.skipDialogue();
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) pause();
    return;
  }
  menuKey(e);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); pause(); } });

function menuKey(e) {
  if (e.repeat && !e.code.startsWith('Arrow')) return;
  const root = $(screen); if (!root) return;
  const items = [...root.querySelectorAll('button:not([disabled]), a[href], input')].filter(el => el.offsetParent !== null && !el.closest('.difficulty, .mini-chars'));
  const i = items.indexOf(document.activeElement);
  if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
    const n = items.length; if (!n) return;
    const next = i < 0 ? 0 : (i + (e.code === 'ArrowDown' ? 1 : -1) + n) % n;
    items[next].focus(); sound.sfx('select');
  } else if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && root.querySelector('.difficulty') && document.activeElement?.type !== 'range') {
    setDiff(save.diff + (e.code === 'ArrowRight' ? 1 : -1));
  } else if (['KeyZ', 'Enter', 'Space'].includes(e.code)) {
    const el = document.activeElement;
    if (el && root.contains(el) && el.tagName !== 'INPUT') { e.preventDefault(); el.click(); }
  } else if (['KeyX', 'Escape', 'Backspace'].includes(e.code)) {
    sound.sfx('cancel');
    if (screen === 'pause') resume();
    else if (MENUS.includes(screen) && screen !== 'title') toTitle();
  }
}

// 音声の解除は touchend / click / keydown でも試みる（iOS は pointerdown では解除されない）
for (const type of ['touchend', 'click', 'keydown']) addEventListener(type, () => sound.init(), {capture: true, passive: true});
document.addEventListener('pointerdown', e => {
  sound.init();
  if (e.pointerType === 'touch') markTouch();
  if (screen !== 'playing' || e.target.closest('button, a, input')) return;
  e.preventDefault();
  touches.set(e.pointerId, {x: e.clientX, y: e.clientY});
  // 2本目の指が触れた瞬間（2本同時タップも含む）にボム。移動は1本目の指のまま
  if (e.pointerType === 'touch' && touches.size === 2) { if (!game?.dialogue) bombQueued = true; return; }
  if (touches.size > 2) return;
  if (game?.dialogue) game.advanceDialogue();
  drag = {id: e.pointerId, x: e.clientX, y: e.clientY};
}, {passive: false});
document.addEventListener('pointermove', e => {
  const t = touches.get(e.pointerId); if (t) { t.x = e.clientX; t.y = e.clientY; }
  if (!drag || e.pointerId !== drag.id || screen !== 'playing') return;
  const k = W / fieldCssW * save.sens * (isFocus() ? .55 : 1);
  moveX += (e.clientX - drag.x) * k; moveY += (e.clientY - drag.y) * k;
  drag.x = e.clientX; drag.y = e.clientY;
});
const endDrag = e => {
  touches.delete(e.pointerId);
  if (!drag || e.pointerId !== drag.id) return;
  // 移動していた指を離しても、残っている指でそのまま動かせる
  const [id, t] = touches.entries().next().value || [];
  drag = id === undefined ? null : {id, x: t.x, y: t.y};
};
document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
document.addEventListener('contextmenu', e => e.preventDefault());

$('bombBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); sound.init(); markTouch(); if (screen === 'playing') bombQueued = true; });
$('focusBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); sound.init(); markTouch(); setTouchFocus(!touchFocus); });
$('pauseBtn').addEventListener('click', pause);
$('skipBtn').addEventListener('click', () => game?.skipDialogue());

const ACTIONS = {
  select: () => { buildChars(); refreshDifficulty(); show('select'); }, start: startStory,
  practice: () => { persist(); sound.resume(); sound.play('title'); buildChars(); buildPractice(); show('practice'); },
  music: () => { roomTrack = 'title'; buildMusic(); show('music'); }, help: () => show('help'),
  settings: () => { refreshSettings(); show('settings'); }, title: toTitle, resume, retry, continue: continueGame,
};
document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
  sound.init(); const act = b.dataset.act;
  if (!['start', 'retry', 'continue'].includes(act)) sound.sfx(act === 'title' ? 'cancel' : 'confirm');
  ACTIONS[act]?.();
}));
$('soundToggle').addEventListener('click', () => { save.sound = !save.sound; sound.setEnabled(save.sound); persist(); refreshSettings(); sound.sfx('select'); });
$('fxToggle').addEventListener('click', () => { save.fx = !save.fx; renderer.setQuality(save.fx); persist(); refreshSettings(); sound.sfx('select'); });
$('musicVol').addEventListener('input', e => { save.music = Number(e.target.value); sound.setMusic(save.music); persist(); });
$('sfxVol').addEventListener('input', e => { save.sfx = Number(e.target.value); sound.setSfx(save.sfx); persist(); sound.sfx('item'); });
$('sens').addEventListener('input', e => { save.sens = Number(e.target.value); persist(); $('sensOut').textContent = save.sens.toFixed(1); });
$('resetData').addEventListener('click', () => {
  if (!confirm('ハイスコアとスペルアリアの記録を消去しますか？')) return;
  const keep = {sound: save.sound, music: save.music, sfx: save.sfx, sens: save.sens, diff: save.diff, char: save.char, fx: save.fx};
  save = {...fresh(), ...keep}; persist(); refreshTitle(); sound.sfx('cancel');
});

// ---------- レイアウト ----------
let layoutTimer = 0;
function layout() {
  const vw = innerWidth, vh = innerHeight, touch = document.body.classList.contains('touch'), land = vw >= vh * 1.02;
  document.body.classList.toggle('portrait', !land); document.body.classList.toggle('landscape', land);
  let availW, availH;
  if (land) {
    const hudW = clamp(vw * .19, 150, 240), ctrlW = touch ? clamp(vw * .13, 96, 170) : 0;
    document.documentElement.style.setProperty('--hudW', hudW + 'px'); document.documentElement.style.setProperty('--ctrlW', ctrlW + 'px');
    availW = vw - hudW - ctrlW - 60; availH = vh - 34;
  } else {
    availW = vw - 24; availH = vh - 60 - (touch ? 104 : 0) - 44;
  }
  const s = Math.max(.4, Math.min(availW / W, availH / H)), cssW = Math.floor(W * s), cssH = Math.floor(H * s);
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px'; fieldCssW = cssW;
  let dpr = Math.min(2, devicePixelRatio || 1);
  if (cssW * cssH * dpr * dpr > 2.6e6) dpr = Math.sqrt(2.6e6 / (cssW * cssH));
  const pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
  if (pw !== canvas.width || ph !== canvas.height) renderer.resize(pw, ph);
}
addEventListener('resize', () => { clearTimeout(layoutTimer); layoutTimer = setTimeout(layout, 80); });

// ---------- 情報欄 ----------
const hudCache = {};
function setHud(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHud() {
  const g = activeGame(), real = g !== demo;
  setHud('hudHi', fmt(Math.max(save.hi[real ? g.level : save.diff], real && g.mode === 'story' ? g.score : 0)));
  setHud('hudScore', real ? fmt(g.score) : '0');
  setHud('hudLives', real ? (g.lives > 0 ? '★'.repeat(g.lives) : '—') : '');
  setHud('hudBombs', real ? (g.bombs > 0 ? '✦'.repeat(g.bombs) : '—') : '');
  setHud('hudPower', real ? (g.power >= MAX_POWER ? 'MAX' : g.power.toFixed(2)) : '');
  setHud('hudGraze', real ? fmt(g.graze) : '');
  setHud('hudPoint', real ? fmt(g.pointValue) : '');
  const reso = real ? Math.round(clamp(g.reso, 0, 1) * 100) : 0, fort = real && g.fort;
  if (hudCache.reso !== reso) { hudCache.reso = reso; $('hudReso').firstElementChild.style.width = reso + '%'; }
  if (hudCache.fort !== fort) { hudCache.fort = fort; $('hudReso').closest('.reso').classList.toggle('on', fort); }
  if (real && screen === 'playing') $('skipBtn').hidden = !g.dialogue;
}

// ---------- ループ ----------
function tickOnce() {
  if (screen === 'playing' && game) {
    game.step(buildInput());
    processEvents(game); renderer.tick(game);
    if (endTimer > 0 && --endTimer === 0) finishTo(endScreen);
  } else if (activeGame() === demo) {
    demo.step({});
    for (const e of demo.events) if (e.type !== 'music' && e.type !== 'stage') renderer.handle(e, demo);
    demo.events.length = 0; renderer.tick(demo);
  }
}
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  let steps = 0;
  while (acc >= STEP && steps < 4) { acc -= STEP; steps++; tickOnce(); }
  if (steps >= 4) acc = 0; // 処理落ち時は時間を捨てて、公平なスローモーションにする
  const g = activeGame();
  renderer.draw(g, {demo: g === demo, pulse: sound.pulse()});
  updateHud();
  if (screen === 'music') drawScope();
  requestAnimationFrame(frame);
}

if (matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
layout(); refreshDifficulty(); refreshTitle(); show('title'); sound.play('title');
$('loading').hidden = true;
requestAnimationFrame(t => { last = t; frame(t); });
window.__starfall2 = {get game() { return game; }, get demo() { return demo; }, get screen() { return screen; }, get save() { return save; }, sound, renderer, startPractice, startStory, Game};
