// すすめかた・そうさ・がめんの きりかえ
import { W, H, WORLDS, FINAL, worldById } from './data.mjs';
import * as C from './core.mjs';
import * as V from './view.mjs';
import * as D from './draw.mjs';
import { SCENES, drawPage } from './cutscene.mjs';
import { Sound } from './audio.mjs';

const SAVE_KEY = 'punyu-game-world-v1';
const cv = document.getElementById('screen'), c = cv.getContext('2d');
let save = C.newSave();
try { save = C.loadSave(localStorage.getItem(SAVE_KEY)); } catch { /* ほぞん できなくても あそべる */ }
const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* なにも しない */ } };
const sound = new Sound(save.sound);

const G = { scr: 'boot', st: 0, t: 0, cut: null, run: null, world: null, result: null, paused: false, fx: [], taps: [], shake: 0, touch: true, toast: null };
const inp = { ptr: new Map(), stick: null, dx: 0, dy: 0, act: false, keys: new Set(), dragId: null };

// ---------- がめんの おおきさ ----------
function resize() {
  const k = Math.min(innerWidth / W, innerHeight / H), dpr = Math.min(2, devicePixelRatio || 1);
  cv.style.width = `${W * k}px`; cv.style.height = `${H * k}px`;
  cv.width = Math.round(W * k * dpr); cv.height = Math.round(H * k * dpr);
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200)); resize();
const toLogical = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };

// ---------- にゅうりょく ----------
const inAct = p => Math.hypot(p.x - V.ACT_BTN.x, p.y - V.ACT_BTN.y) < V.ACT_BTN.r + 26;
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); sound.unlock();
  const p = toLogical(e);
  inp.ptr.set(e.pointerId, p); G.taps.push(p);
  if (G.scr === 'play' && !G.paused && G.run.kind === 'adventure') {
    if (inAct(p)) inp.act = true;
    else if (!V.inRect(p, V.PAUSE_BTN) && !inp.stick) inp.stick = { id: e.pointerId, ox: p.x, oy: p.y, vx: 0, vy: 0 };
  }
  if (inp.dragId === null) inp.dragId = e.pointerId;
});
cv.addEventListener('pointermove', e => {
  const last = inp.ptr.get(e.pointerId); if (!last) return;
  const p = toLogical(e);
  if (e.pointerId === inp.dragId) { inp.dx += (p.x - last.x) * 1.15; inp.dy += (p.y - last.y) * 1.15; }
  if (inp.stick && inp.stick.id === e.pointerId) { const dx = p.x - inp.stick.ox, dy = p.y - inp.stick.oy, d = Math.hypot(dx, dy), m = Math.min(1, d / 48); inp.stick.vx = d ? dx / d * m : 0; inp.stick.vy = d ? dy / d * m : 0; }
  inp.ptr.set(e.pointerId, p);
});
const up = e => { inp.ptr.delete(e.pointerId); if (inp.stick && inp.stick.id === e.pointerId) inp.stick = null; if (inp.dragId === e.pointerId) inp.dragId = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
const LANE_KEYS = { ArrowLeft: 0, a: 0, 1: 0, ArrowDown: 1, s: 1, 2: 1, ArrowRight: 2, d: 2, 3: 2 };
addEventListener('keydown', e => {
  if (e.repeat) return;
  sound.unlock(); inp.keys.add(e.key); G.touch = false;
  if (e.key === 'Escape' || e.key === 'p') { if (G.scr === 'play') setPause(!G.paused); return; }
  if (G.scr === 'play' && !G.paused) {
    const r = G.run;
    if (r.kind === 'rhythm' && e.key in LANE_KEYS && r.intro <= 0) hitLane(LANE_KEYS[e.key]);
    if (r.kind === 'adventure' && (e.key === ' ' || e.key === 'z' || e.key === 'Enter')) inp.act = true;
  } else if (e.key === ' ' || e.key === 'Enter') G.taps.push({ x: W / 2, y: H / 2, key: true });
  if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
});
addEventListener('keyup', e => inp.keys.delete(e.key));
document.addEventListener('visibilitychange', () => { if (document.hidden && G.scr === 'play') setPause(true); });
const keyAxis = () => ({ x: (inp.keys.has('ArrowRight') || inp.keys.has('d') ? 1 : 0) - (inp.keys.has('ArrowLeft') || inp.keys.has('a') ? 1 : 0), y: (inp.keys.has('ArrowDown') || inp.keys.has('s') ? 1 : 0) - (inp.keys.has('ArrowUp') || inp.keys.has('w') ? 1 : 0) });

// ---------- えんしゅつ ----------
function burst(x, y, n, col, o = {}) {
  for (let i = 0; i < n; i++) { const a = Math.random() * D.TAU, v = (o.v || 160) * (0.4 + Math.random()); G.fx.push({ kind: o.kind || 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), life: o.life || 0.6, max: o.life || 0.6, c: Array.isArray(col) ? col[i % col.length] : col, size: o.size || 9 }); }
}
const say = (x, y, text, o = {}) => G.fx.push({ kind: 'text', x, y, vx: 0, vy: -40, life: o.life || 0.9, max: o.life || 0.9, text, size: o.size || 30, c: o.c, stroke: o.stroke });
const ring = (x, y, col, size = 70) => G.fx.push({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, c: col, size });
function stepFx(dt) { for (const p of G.fx) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } G.fx = G.fx.filter(p => p.life > 0); if (G.fx.length > 260) G.fx.splice(0, G.fx.length - 260); }

// ---------- がめんの きりかえ ----------
function go(scr) { G.scr = scr; G.st = 0; G.fx = []; G.paused = false; inp.stick = null; }
function toBoot() { go('boot'); sound.loop('hub'); }
function toHub() { go('hub'); G.run = null; sound.loop('hub'); }
function playCut(id, ctx, then, music = 'hub') {
  go('cut'); G.cut = { pages: SCENES[id](ctx || {}), i: 0, t: 0, then };
  sound.loop(music); if (G.cut.pages[0].sfx) sound.play(G.cut.pages[0].sfx);
}
function nextPage() {
  const q = G.cut; q.i++; q.t = 0;
  if (q.i >= q.pages.length) { const f = q.then; G.cut = null; f(); return; }
  sound.play('page'); if (q.pages[q.i].sfx) sound.play(q.pages[q.i].sfx);
}
const musicOf = (world, def) => (world.id === 'bug' ? 'bug' : def.kind === 'danmaku' ? 'star' : def.kind === 'adventure' ? 'hero' : null);
function toWorldTitle(world) { go('wtitle'); G.world = world; sound.loop(world.id === 'bug' ? 'bug' : world.id === 'idol' ? 'hub' : world.id); }
function enterWorld(world) {
  const enter = () => playCut('enter', { world }, () => toWorldTitle(world), world.id === 'bug' ? 'bug' : 'hub');
  if (world.id === 'bug' && !save.worlds.bug) playCut('finalIntro', {}, enter, 'bug'); else enter();
}

function startStage(world, i, ratings = [], skipCut = false) {
  const def = world.stages[i];
  if (def.bossIntro && !skipCut) { playCut(def.bossIntro, {}, () => startStage(world, i, ratings, true), musicOf(world, def) || 'hub'); return; }
  const sim = def.kind === 'danmaku' ? C.newDanmaku(def, 7 + i) : def.kind === 'adventure' ? C.newAdventure(def, 11 + i) : C.newRhythm(def);
  go('play');
  G.run = { world, i, def, sim, kind: def.kind, intro: 2.6, outro: 0, ratings, spell: null, laneFlash: [0, 0, 0], jump: 0, songStart: null };
  inp.dx = inp.dy = 0; inp.act = false;
  const m = musicOf(world, def);
  if (m) sound.loop(m, i === 2 && world.id !== 'bug' ? 1.1 : 1); else sound.stop();
  sound.play(world.id === 'bug' && i > 0 ? 'henshin' : 'ok');
}
function finishStage() {
  const r = G.run;
  if (r.i + 1 < r.world.stages.length) { startStage(r.world, r.i + 1, r.ratings); return; }
  const stars = C.avgStars(r.ratings), world = r.world;
  C.recordClear(save, world.id, stars);
  const toResult = () => { go('result'); G.result = { world, stars }; sound.loop('hub'); sound.play('clear'); };
  if (world.id === 'bug') { save.ending = true; store(); playCut('ending', {}, toResult); }
  else { store(); playCut('clear', { world }, toResult); }
}
function setPause(on) {
  if (G.scr !== 'play' || G.paused === on) return;
  G.paused = on; inp.stick = null;
  if (on && G.run.kind === 'rhythm') sound.stop();
  if (!on && G.run.kind === 'rhythm') startStage(G.run.world, G.run.i, G.run.ratings, true);   // うたは あたまから
}

// ---------- あそびの こうしん ----------
function hitLane(lane) {
  const r = G.run, s = r.sim;
  if (r.songStart === null) return;
  r.laneFlash[lane] = 0.25;
  C.tapLane(s, lane, sound.now() - r.songStart);
}
let starSfx = 0;
function handleEvents(r) {
  const s = r.sim;
  for (const e of s.ev) {
    switch (e.t) {
      case 'hit': sound.play('hit'); say(e.x, e.y - 40, 'ぽよん', { c: '#fff', stroke: '#ff5fae' }); burst(e.x, e.y, 10, ['#fff', '#ff9fd0']); G.shake = 0.25; break;
      case 'star': if (G.t - starSfx > 0.05) { starSfx = G.t; sound.play('star'); } burst(e.x, e.y, 2, D.COL.gold, { v: 60, life: 0.35, size: 6 }); break;
      case 'graze': sound.play('graze'); burst(e.x, e.y, 1, '#fff', { kind: 'dot', v: 50, life: 0.3, size: 4 }); break;
      case 'shotHit': burst(e.x, e.y, 1, '#ffe9a8', { kind: 'dot', v: 70, life: 0.2, size: 4 }); break;
      case 'pop': sound.play('pop'); burst(e.x, e.y, 8, [D.COL.gold, '#fff']); ring(e.x, e.y, '#fff', 50); break;
      case 'spell': r.spell = { name: e.name, boss: e.boss, t: 0 }; sound.play('spell'); break;
      case 'phaseClear': if (r.kind === 'danmaku') { sound.play('phaseClear'); r.spell = null; } break;
      case 'bossDown': sound.play('bossDown'); burst(e.x, e.y, 30, [D.COL.gold, '#fff', D.COL.pink], { v: 320, life: 1 }); ring(e.x, e.y, '#fff', 160); say(e.x, e.y - 30, 'やったね！', { size: 44, life: 1.4, c: '#ffd84a' }); G.shake = 0.4; break;
      case 'swing': sound.play('swing'); break;
      case 'cut': sound.play('cut'); burst(e.x, e.y, 7, ['#5fd06a', '#2f9a45'], { kind: 'dot', v: 150, size: 7, up: 60 }); break;
      case 'key': sound.play('key'); say(e.x, e.y - 30, 'かぎを みつけた！', { c: '#ffd84a', life: 1.6 }); burst(e.x, e.y, 12, D.COL.gold); break;
      case 'door': sound.play('door'); say(W / 2, 110, 'とびらが ひらいた！', { c: '#ffd84a', life: 1.6 }); break;
      case 'locked': sound.play('locked'); say(s.px, s.py - 50, 'かぎが いるよ', { size: 24 }); break;
      case 'thud': sound.play('thud'); G.shake = 0.3; ring(e.x, e.y + 30, '#fff', 90); break;
      case 'dizzy': sound.play('dizzy'); say(s.boss.px, s.boss.py - 90, 'いまだ！', { c: '#ffd84a', size: 36, life: 1.2 }); break;
      case 'bossHit': sound.play('bossHit'); burst(e.x, e.y, 10, ['#fff', D.COL.gold]); G.shake = 0.15; break;
      case 'perfect': case 'good': {
        const x = V.LANE_X[e.lane]; sound.play(e.t); ring(x, V.HIT_Y, '#fff', 100);
        say(x, V.HIT_Y - 80, e.t === 'perfect' ? 'かんぺき！' : 'いいね！', { c: e.t === 'perfect' ? '#ffd84a' : '#fff', stroke: '#ff3f9a', size: e.t === 'perfect' ? 34 : 28, life: 0.6 });
        burst(x, V.HIT_Y, e.t === 'perfect' ? 10 : 5, [D.COL.gold, '#fff', D.COL.pink], { v: 220 }); if (e.t === 'perfect') r.jump = 0.35; break;
      }
      case 'tap': sound.play('tap'); break;
      case 'miss': break;
      default: sound.play(e.t);   // push, switch, chest, chestAppear, clang, call
    }
  }
  s.ev.length = 0;
}

function updatePlay(dt) {
  const r = G.run, s = r.sim;
  // ひとやすみ ボタン
  for (const p of G.taps) if (!p.key && V.inRect(p, V.PAUSE_BTN)) { setPause(true); sound.play('tap'); return; }
  if (r.intro > 0) {
    r.intro -= dt; if (G.taps.length && r.intro < 2.0) r.intro = 0;
    if (r.intro <= 0 && r.kind === 'rhythm') r.songStart = sound.song(r.def);
    inp.dx = inp.dy = 0; inp.act = false; return;
  }
  if (r.outro > 0) { r.outro -= dt; if (r.outro <= 0) finishStage(); return; }
  const k = keyAxis();
  if (r.kind === 'danmaku') { C.stepDanmaku(s, dt, { dx: inp.dx, dy: inp.dy, kx: k.x, ky: k.y }); if (r.spell) r.spell.t += dt; }
  else if (r.kind === 'adventure') {
    const st = inp.stick;
    C.stepAdventure(s, dt, { mx: (st ? st.vx : 0) + k.x, my: (st ? st.vy : 0) + k.y, act: inp.act });
    if (s.chest === 'open' && Math.random() < 0.3) burst(s.px + (Math.random() - 0.5) * 80, s.py - 70, 1, D.COL.gold, { v: 40, life: 0.5 });
  } else {
    for (const p of G.taps) if (!p.key && p.y > 60) hitLane(Math.min(2, Math.floor(p.x / (W / 3))));
    C.stepRhythm(s, sound.now() - r.songStart);
    for (let i = 0; i < 3; i++) r.laneFlash[i] = Math.max(0, r.laneFlash[i] - dt);
    r.jump = Math.max(0, r.jump - dt);
  }
  inp.dx = inp.dy = 0; inp.act = false;
  handleEvents(r);
  if (s.done) {
    r.outro = 2.2; r.ratings.push(C.rating(s));
    C.recordStage(save, r.world.id, r.i, r.world.stages.length); store();
    sound.play('clear'); burst(W / 2, 250, 40, [D.COL.gold, '#fff', D.COL.pink], { v: 420, life: 1.2 });
    if (r.kind === 'rhythm') sound.play('cheer');
  }
}

function updatePause() {
  for (const p of G.taps) {
    const it = V.PAUSE_ITEMS.find(b => V.inRect(p, b)); if (!it) continue;
    sound.play('tap');
    const i = V.PAUSE_ITEMS.indexOf(it), r = G.run;
    if (i === 0) setPause(false);
    else if (i === 1) startStage(r.world, r.i, r.ratings, true);
    else if (i === 2) toWorldTitle(r.world);
    else { save.sound = !save.sound; sound.setOn(save.sound); store(); }
    return;
  }
}

function update(dt) {
  G.t += dt; G.st += dt; if (G.shake > 0) G.shake -= dt;
  stepFx(dt);
  const tap = G.taps[0];
  if (G.scr === 'boot') {
    if (tap && G.st > 0.4) { sound.play('ok'); if (!save.opening) playCut('opening', {}, () => { save.opening = true; store(); toHub(); }); else toHub(); }
  } else if (G.scr === 'cut') {
    const q = G.cut; q.t += dt;
    if (tap) {
      if (!tap.key && V.inRect(tap, V.SKIP_BTN)) { sound.play('tap'); const f = q.then; G.cut = null; f(); }
      else if (q.typing) q.t = 99; else if (q.t > 0.25) nextPage();
    }
  } else if (G.scr === 'hub') {
    if (tap && !tap.key) {
      const card = V.HUB_CARDS.find(k => V.inRect(tap, k));
      if (card) {
        if (card.world.id === 'bug' && !C.finalUnlocked(save, WORLDS.map(w => w.id))) { sound.play('locked'); say(card.x + card.w / 2, card.y - 10, 'まだ ひらかないよ', { size: 24 }); }
        else { sound.play('ok'); enterWorld(card.world); }
      } else if (V.inRect(tap, V.HUB_BTNS.story)) { sound.play('tap'); playCut('opening', {}, toHub); }
      else if (V.inRect(tap, V.HUB_BTNS.sound)) { save.sound = !save.sound; sound.setOn(save.sound); store(); sound.play('tap'); }
    }
  } else if (G.scr === 'wtitle') {
    if (tap && G.st > 0.3) {
      if (!tap.key && V.inRect(tap, V.BACK_BTN)) { sound.play('tap'); toHub(); }
      else { sound.play('ok'); startStage(G.world, save.worlds[G.world.id]?.reached || 0); }
    }
  } else if (G.scr === 'play') {
    if (G.paused) updatePause(); else updatePlay(dt);
  } else if (G.scr === 'result') {
    if (Math.random() < 0.2) burst(Math.random() * W, -10, 1, [D.COL.gold, D.COL.pink, '#fff'], { v: 30, life: 2.2, up: -160 });
    if (tap && G.st > 2) { sound.play('ok'); toHub(); }
  }
  G.taps.length = 0;
}

function draw() {
  const k = cv.width / W;
  c.setTransform(k, 0, 0, k, 0, 0);
  if (G.shake > 0) c.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
  const t = G.t;
  if (G.scr === 'boot') V.drawBoot(c, t);
  else if (G.scr === 'cut') {
    const q = G.cut; q.typing = drawPage(c, q.pages[q.i], q.t, q.i, q.pages.length);
    V.button(c, V.SKIP_BTN, 'とばす ▶▶', { size: 20, bg: 'rgba(255,255,255,.85)' });
  } else if (G.scr === 'hub') { V.drawHub(c, t, save); V.drawFx(c, G.fx); }
  else if (G.scr === 'wtitle') V.drawWorldTitle(c, G.world, t, save);
  else if (G.scr === 'play') {
    const r = G.run, ui = { t, fx: G.fx, world: r.world, spell: r.spell, stick: inp.stick, touch: G.touch, laneFlash: r.laneFlash, jump: r.jump };
    if (r.kind === 'danmaku') V.drawDanmaku(c, r.sim, ui); else if (r.kind === 'adventure') V.drawAdventure(c, r.sim, ui); else V.drawRhythm(c, r.sim, ui);
    if (r.intro > 0) V.drawStageCard(c, r, 2.6 - r.intro);
    if (r.outro > 0) V.drawStageClear(c, r, 2.2 - r.outro);
    if (G.paused) V.drawPause(c, save);
  } else if (G.scr === 'result') { V.drawResult(c, G.result.world, G.result.stars, G.st); V.drawFx(c, G.fx); }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try { update(dt); draw(); } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
toBoot();
requestAnimationFrame(frame);

// かくにんよう（開発者が コンソールから つかう）
window.__punyu = { G, save, sound, startStage: (id, i) => startStage(worldById(id), i, [], true), cut: (id, wid) => playCut(id, { world: worldById(wid || 'star') }, toHub), title: id => toWorldTitle(worldById(id)), hub: toHub, result: (id, n) => { go('result'); G.result = { world: worldById(id), stars: n }; }, FINAL };
