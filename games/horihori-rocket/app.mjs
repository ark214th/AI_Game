// ほりほり ロケット工場：ばめんの すすみかた・そうさ・えを かく
import * as C from './core.mjs';
import { Sound } from './audio.mjs';
import * as D from './draw.mjs';

const { T, W, H, SKY, HOPPER } = C;
const $ = id => document.getElementById(id);
const STORE = 'horihori-rocket-v1';
// なおしたら ここを あげる（タイトルと せっていに 出て、あたらしい ばんか わかる）
const VERSION = 'v1.5', UPDATED = '2026/10/25 18:45';

// ---------- ほぞん ----------
let save;
try { save = C.normalize(JSON.parse(localStorage.getItem(STORE) || 'null')); } catch { save = C.newSave(); }
let fresh = true;
try { fresh = !localStorage.getItem(STORE); } catch { /* なにも しない */ }
let base = C.genWorld(save.seed);
let world = C.genWorld(save.seed);
C.applyDug(world, save.dug);

let resetting = false; // さいしょから に する ときは もう ほぞん しない
function persist() {
  if (resetting) return;
  save.dug = C.encodeDug(world, base);
  save.px = p.x; save.py = p.y;
  try { localStorage.setItem(STORE, JSON.stringify(save)); } catch { /* ほぞん できなくても あそべる */ }
}

const snd = new Sound(save.sound);

// ---------- じょうたい ----------
const PW = 0.76, PH = 0.76, HW = PW / 2, HH = PH / 2;
const p = { x: save.px, y: save.py, vx: 0, vy: 0, face: 1, dir: null, dig: null, grounded: false, energy: 0, jet: false };
const keys = { left: false, right: false, up: false, down: false };
let flow = C.computeFlow(save);
let items = [];      // ベルトの 上の こうせき {x, y, to, ore, auto}
let flyers = [];     // ホッパーに とんでいく こうせき {x, y, t, ore}
let pops = [];       // うかぶ 字 {x, y, text, color, t}
let parts = [];      // つぶ {x, y, vx, vy, t, color}
let mode = 'title';  // title | play | build | launch
let tool = 'hand';
let cam = { x: 0, y: -4 }, camOff = { x: 0, y: 0 };
let time = 0, hopperPulse = 0, sellT = 0, unloadT = 0, saveT = 0, lowT = 0, msgT = {};
let launch = null;
let lastGoal = -1;
let ts = 48, ts0 = 48, vw = 0, vh = 0, dpr = 1;
const art = new D.TileArt();

p.energy = C.upVal(save, 'tank');
if (p.y > 0 && C.solid(world, Math.floor(p.x), Math.floor(p.y))) { p.x = C.HOME_X; p.y = -1.8; }

// ---------- がめんの おおきさ ----------
const cv = $('world'), g = cv.getContext('2d');
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = window.innerWidth; vh = window.innerHeight;
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  ts0 = Math.max(vh / (vh < 600 ? 10 : 12), vw / W);
  applyZoom();
}
// つくる モードでは すこし ひいて ひろく 見せる
function applyZoom() {
  ts = mode === 'build' ? Math.max(ts0 * 0.7, vw / W) : ts0;
  art.setSize(Math.ceil(ts * dpr));
}
window.addEventListener('resize', resize);
resize();

// ---------- ちいさな ひょうじ ----------
function toast(msg, key, gap = 2.5) {
  if (key) { if (msgT[key] && time - msgT[key] < gap) return; msgT[key] = time; }
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1800);
}
const pop = (x, y, text, color = '#fff') => pops.push({ x, y, text, color, t: 0 });
const burst = (x, y, color, n = 6) => { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, t: 0, color }); };

function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

function show(id) { $(id).hidden = false; }
function hide(id) { $(id).hidden = true; }
const anyScreen = () => ['shop', 'museum', 'settings', 'resetAsk', 'help', 'popup', 'ending', 'title'].some(id => !$(id).hidden);

// ---------- そうさ ----------
document.querySelectorAll('.pbtn').forEach(b => {
  const k = b.dataset.k;
  let id = null;
  const on = e => { e.preventDefault(); snd.unlock(); id = e.pointerId; keys[k] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch { /* なくても よい */ } };
  const off = e => { if (e.pointerId !== id) return; id = null; keys[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', ' ': 'up' };
window.addEventListener('keydown', e => { const k = KEYMAP[e.key]; if (k) { keys[k] = true; e.preventDefault(); snd.unlock(); } });
window.addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ---------- ほる・うごく ----------
const tileSolid = (x, y) => C.solid(world, x, y);
const power = () => C.upVal(save, 'drill');

function collideX() {
  if (p.x - HW < 0) { p.x = HW; p.vx = 0; return -1; }
  if (p.x + HW > W) { p.x = W - HW; p.vx = 0; return 1; }
  const y0 = Math.floor(p.y - HH + 0.02), y1 = Math.floor(p.y + HH - 0.02);
  if (p.vx > 0) {
    const tx = Math.floor(p.x + HW);
    for (let y = y0; y <= y1; y++) if (tileSolid(tx, y)) { p.x = tx - HW - 0.001; p.vx = 0; return 1; }
  } else if (p.vx < 0) {
    const tx = Math.floor(p.x - HW);
    for (let y = y0; y <= y1; y++) if (tileSolid(tx, y)) { p.x = tx + 1 + HW + 0.001; p.vx = 0; return -1; }
  }
  return 0;
}
function collideY() {
  const x0 = Math.floor(p.x - HW + 0.02), x1 = Math.floor(p.x + HW - 0.02);
  if (p.y - HH < -SKY) { p.y = -SKY + HH; p.vy = 0; }
  if (p.vy > 0) {
    const ty = Math.floor(p.y + HH);
    for (let x = x0; x <= x1; x++) if (tileSolid(x, ty)) { p.y = ty - HH - 0.001; p.vy = 0; return 1; }
  } else if (p.vy < 0) {
    const ty = Math.floor(p.y - HH);
    for (let x = x0; x <= x1; x++) if (tileSolid(x, ty)) { p.y = ty + 1 + HH + 0.001; p.vy = 0; return -1; }
  }
  return 0;
}

function tryDig(tx, ty, dir) {
  const info = C.digInfo(world, tx, ty, power());
  if (!info.ok) {
    if (info.why === 'hard') { toast(`かたくて ほれない！ ドリル レベル${info.need}が いるよ`, 'hard'); snd.play('clank', 0.3); }
    if (info.why === 'bedrock') toast('ここより 下は ほれないよ', 'bed');
    return false;
  }
  p.dig = { tx, ty, dir, t: 0, time: info.time };
  p.dir = dir;
  return true;
}

function finishDig() {
  const { tx, ty } = p.dig;
  const got = C.dig(world, tx, ty);
  p.dig = null;
  save.stats.dug++;
  snd.play('break', 0.05);
  const band = C.bandAt(ty);
  burst(tx + 0.5, ty + 0.5, band.color, 7);
  if (got.ore) {
    if (C.bagCount(save) < C.upVal(save, 'bag')) {
      save.bag[got.ore] = (save.bag[got.ore] || 0) + 1;
      pop(tx + 0.5, ty + 0.3, `+${C.ORES[got.ore].name}`, C.ORES[got.ore].shine);
      snd.play('ore', 0, Object.keys(C.ORES).indexOf(String(got.ore)));
      bump($('bagPill'));
    } else {
      toast('バッグが いっぱい！ ホッパーか ベルトへ', 'full');
      snd.play('no', 0.5);
    }
  } else if (got.fossil !== undefined) {
    const i = got.fossil, first = save.fossils[i] === 0;
    save.fossils[i]++;
    const bonus = first ? C.fossilBonus(i) : Math.round(C.fossilBonus(i) / 5);
    save.money += bonus; save.stats.earned += bonus;
    snd.play('fossil');
    if (first) popup(FOSSIL_ICON[i], '化石を 見つけた！', `「${C.FOSSILS[i].name}」 ボーナス ${bonus}えん`);
    else pop(tx + 0.5, ty + 0.3, `${C.FOSSILS[i].name} +${bonus}`, '#ffe9a8');
  } else if (got.treasure !== undefined) {
    const i = got.treasure;
    save.treasures[i] = true;
    snd.play('treasure');
    popup('🎁', 'たからを 見つけた！', `「${C.TREASURES[i].name}」で ロケットの ${C.PARTS[i].name}が つくれるよ`);
  }
  save.stats.deepest = Math.max(save.stats.deepest, ty + 1);
  persist();
}

function updatePlayer(dt) {
  const ctl = mode === 'play' && !anyScreen();
  const L = ctl && keys.left, R = ctl && keys.right, U = ctl && keys.up, Dn = ctl && keys.down;
  const maxE = C.upVal(save, 'tank');
  p.jet = false;
  if (anyScreen()) return; // おみせなどを ひらいている あいだは とまる

  if (p.dig) {
    const d = p.dig;
    const still = (d.dir === 'd' && Dn) || (d.dir === 'l' && L) || (d.dir === 'r' && R) || (d.dir === 'u' && U);
    if (!still || !tileSolid(d.tx, d.ty)) { p.dig = null; }
    else {
      d.t += dt;
      // マスの まんなかに よせる
      if (d.dir === 'd' || d.dir === 'u') p.x += (d.tx + 0.5 - p.x) * Math.min(1, dt * 12);
      else p.y += (d.ty + 0.5 - p.y) * Math.min(1, dt * 12);
      snd.play('drill', 0.09);
      if (Math.random() < dt * 20) burst(d.tx + 0.5 + (Math.random() - 0.5) * 0.6, d.ty + 0.5, C.bandAt(d.ty).color, 1);
      if (d.t >= d.time) finishDig();
      if (p.y > 0.5) p.energy -= dt * 1.4;
      return;
    }
  }

  const speed = 4.2 + save.up.jet * 0.5;
  const target = (R ? 1 : 0) - (L ? 1 : 0);
  if (target) p.face = target;
  p.vx += (target * speed - p.vx) * Math.min(1, dt * (p.grounded ? 14 : 7));
  const jetMax = C.upVal(save, 'jet');
  if (U) {
    p.vy -= (34 + jetMax * 2) * dt;
    if (p.vy < -jetMax) p.vy = -jetMax;
    p.jet = true;
    if (Math.random() < dt * 25) parts.push({ x: p.x + (Math.random() - 0.5) * 0.4, y: p.y + 0.4, vx: (Math.random() - 0.5), vy: 3, t: 0, color: '#ffb02e' });
    snd.play('jet', 0.12);
  } else {
    p.vy += 32 * dt;
    if (p.vy > 16) p.vy = 16;
  }
  p.x += p.vx * dt;
  const hx = collideX();
  p.y += p.vy * dt;
  const hy = collideY();
  p.grounded = hy === 1 || tileSolid(Math.floor(p.x), Math.floor(p.y + HH + 0.05)) && Math.abs(p.vy) < 0.01;

  // ほりはじめ
  if (Dn && p.grounded) tryDig(Math.floor(p.x), Math.floor(p.y + HH + 0.05), 'd');
  else if ((R && (hx === 1 || tileSolid(Math.floor(p.x + HW + 0.05), Math.floor(p.y)))) && p.x + HW + 0.05 < W) tryDig(Math.floor(p.x + HW + 0.05), Math.floor(p.y), 'r');
  else if ((L && (hx === -1 || tileSolid(Math.floor(p.x - HW - 0.05), Math.floor(p.y)))) && p.x - HW - 0.05 > 0) tryDig(Math.floor(p.x - HW - 0.05), Math.floor(p.y), 'l');
  else if (U && hy === -1) tryDig(Math.floor(p.x), Math.floor(p.y - HH - 0.05), 'u');

  // でんち
  if (p.y > 0.5) { if (mode === 'play') p.energy -= dt * (p.jet ? 1.3 : 1); }
  else p.energy = Math.min(maxE, p.energy + maxE * dt * 0.8);
  if (p.y > 0.5 && p.energy < maxE * 0.2 && time - lowT > 3) { lowT = time; snd.play('low'); toast('でんちが すくないよ！ 上に もどろう', 'low', 6); }
}

function rescue(msg) {
  $('fade').classList.add('on');
  mode = 'warp';
  snd.play('warp');
  setTimeout(() => {
    p.x = C.HOME_X; p.y = -1.8; p.vx = p.vy = 0; p.dig = null;
    p.energy = C.upVal(save, 'tank');
    cam.x = p.x; cam.y = p.y;
    $('fade').classList.remove('on');
    mode = 'play';
    if (msg) toast(msg);
    persist();
  }, 450);
}

// ---------- 売る・はこぶ ----------
const hopperCenter = { x: HOPPER.x + 0.5, y: HOPPER.y + 0.3 };
const ITEM_MAX = 1500; // ベルトの 上に のせて おける こうせきの かず
function sellOre(ore, auto) {
  const v = C.sellValue(ore, save);
  save.money += v; save.stats.earned += v;
  if (auto) save.stats.auto++;
  hopperPulse = 1;
  if (!auto || Math.random() < 0.5) pop(hopperCenter.x + (Math.random() - 0.5) * 0.6, HOPPER.y - 0.6, `+${v}`, '#ffe066');
  snd.play('coin', 0.06);
  bump($('money'));
}

function takeOne() {
  for (const k of Object.keys(save.bag)) {
    if (save.bag[k] > 0) { save.bag[k]--; if (!save.bag[k]) delete save.bag[k]; return Number(k); }
  }
  return null;
}

function updateEconomy(dt) {
  // ホッパーの ちかくで バッグの こうせきを 売る
  sellT -= dt; unloadT -= dt;
  const nearHopper = Math.abs(p.x - hopperCenter.x) < 1.1 && p.y < 0 && p.y > -3;
  if (nearHopper && sellT <= 0 && C.bagCount(save) > 0) {
    const ore = takeOne();
    flyers.push({ x: p.x, y: p.y - 0.2, sx: p.x, sy: p.y - 0.2, t: 0, ore });
    sellT = 0.07;
    snd.play('drop', 0.05);
  }
  // ベルトの 上で のせる
  const k = C.mkey(Math.floor(p.x), Math.floor(p.y));
  if (!nearHopper && flow[k] && unloadT <= 0 && C.bagCount(save) > 0) {
    const ore = takeOne();
    items.push({ x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5, to: flow[k], ore, auto: false });
    unloadT = 0.1;
    snd.play('drop', 0.05);
    toast('ベルトに のせたよ！', 'belt', 20);
  }
  for (const f of flyers) {
    f.t += dt * 3;
    const e = Math.min(1, f.t);
    f.x = f.sx + (hopperCenter.x - f.sx) * e;
    f.y = f.sy + (hopperCenter.y - 0.6 - f.sy) * e - Math.sin(e * Math.PI) * 1.2;
    if (f.t >= 1) sellOre(f.ore, false);
  }
  flyers = flyers.filter(f => f.t < 1);

  // じどうドリル
  for (const o of C.tickDrills(save, flow, dt)) {
    const [x, y] = C.unkey(o.from);
    items.push({ x: x + 0.5, y: y + 0.5, to: o.to, ore: o.ore, auto: true });
  }
  // ベルトの 上を うごく
  const hk = C.mkey(HOPPER.x, HOPPER.y);
  const spd = 5;
  for (const it of items) {
    if (it.done) continue;
    if (it.to !== hk && !save.machines[it.to]) { sellOre(it.ore, it.auto); it.done = true; continue; }
    const [tx, ty] = C.unkey(it.to);
    const cx = tx + 0.5, cy = ty + 0.5;
    const dx = cx - it.x, dy = cy - it.y, d = Math.hypot(dx, dy), step = spd * dt;
    if (d <= step) {
      it.x = cx; it.y = cy;
      if (it.to === hk) { sellOre(it.ore, it.auto); it.done = true; }
      else if (flow[it.to]) it.to = flow[it.to];
    } else { it.x += dx / d * step; it.y += dy / d * step; }
  }
  items = items.filter(i => !i.done);
  // のりすぎた ときは やすい こうせきから その場で 売る（ふかくて 高い こうせきは 地上まで とどける）
  if (items.length > ITEM_MAX) {
    items.sort((a, b) => C.ORES[b.ore].value - C.ORES[a.ore].value);
    items.splice(ITEM_MAX).forEach(i => sellOre(i.ore, i.auto));
  }
}

// ---------- つくる モード ----------
function setMode(m) {
  mode = m;
  $('pad').hidden = m !== 'play';
  $('buildBar').hidden = m !== 'build';
  $('buildHint').hidden = m !== 'build';
  $('hud').hidden = !(m === 'play' || m === 'build');
  $('goal').hidden = !(m === 'play' || m === 'build');
  if (m !== 'build') camOff = { x: 0, y: 0 };
  applyZoom();
  for (const k in keys) keys[k] = false;
  document.querySelectorAll('.pbtn').forEach(b => b.classList.remove('on'));
  if (m === 'build') setTool(tool);
}

const HINTS = {
  hand: 'がめんを ゆびで うごかして 見わたせるよ',
  belt: 'ほった ところを なぞって ベルトを おこう。ホッパーまで つなげてね',
  drill: 'ほった ところの ゆかを タップして じどうドリルを おこう',
  erase: 'ベルトや ドリルを なぞると とりけせるよ（お金は もどる）',
};
function setTool(t) {
  if (t === 'drill' && !save.rooms.workshop) { toast('作業場を たてると おけるよ（🛒おみせの きち）'); snd.play('no'); return; }
  tool = t;
  document.querySelectorAll('.tool[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  $('buildHint').textContent = HINTS[t];
  updateCosts();
}
function updateCosts() {
  $('beltCost').textContent = `${C.BELT_COST}えん`;
  $('drillCost').textContent = save.rooms.workshop ? `${C.placeCost(save, 'drill')}えん` : '🔒';
}
document.querySelectorAll('.tool[data-tool]').forEach(b => b.addEventListener('click', () => { snd.play('tap'); setTool(b.dataset.tool); }));
$('buildDone').addEventListener('click', () => { snd.play('tap'); setMode('play'); persist(); });
$('buildBtn').addEventListener('click', () => { snd.unlock(); snd.play('tap'); setMode(mode === 'build' ? 'play' : 'build'); });

const screenToTile = (sx, sy) => ({ x: Math.floor(sx / ts + cam.x - vw / ts / 2), y: Math.floor(sy / ts + cam.y - vh / ts / 2) });
let drag = null;
function applyTool(tx, ty) {
  if (tool === 'belt') {
    if (save.machines[C.mkey(tx, ty)]) return;
    if (!C.canPlace(world, save, 'belt', tx, ty)) return;
    if (save.money < C.BELT_COST) { toast('お金が たりないよ', 'money'); return; }
    C.place(world, save, 'belt', tx, ty); snd.play('place', 0.04); flow = C.computeFlow(save);
  } else if (tool === 'drill') {
    if (!C.canPlace(world, save, 'drill', tx, ty)) { toast('ほった ところの ゆかに おけるよ', 'dpl'); snd.play('no', 0.3); return; }
    const c = C.placeCost(save, 'drill');
    if (save.money < c) { toast(`お金が たりないよ（${c}えん）`, 'money'); snd.play('no', 0.3); return; }
    C.place(world, save, 'drill', tx, ty); snd.play('buy'); flow = C.computeFlow(save); updateCosts();
    if (!C.drillOutlet(flow, tx, ty)) toast('ベルトで ホッパーと つなごう！', 'conn', 4);
  } else if (tool === 'erase') {
    if (C.removeMachine(save, tx, ty)) { snd.play('remove', 0.04); flow = C.computeFlow(save); updateCosts(); }
  }
}
cv.addEventListener('pointerdown', e => {
  snd.unlock();
  if (mode !== 'build') return;
  const t = screenToTile(e.clientX, e.clientY);
  drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: camOff.x, oy: camOff.y, last: t };
  if (tool !== 'hand') applyTool(t.x, t.y);
  try { cv.setPointerCapture(e.pointerId); } catch { /* なくても よい */ }
});
cv.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId || mode !== 'build') return;
  if (tool === 'hand') {
    camOff.x = drag.ox - (e.clientX - drag.sx) / ts;
    camOff.y = drag.oy - (e.clientY - drag.sy) / ts;
    return;
  }
  if (tool === 'drill') return;
  const t = screenToTile(e.clientX, e.clientY);
  // とびとびに ならないように あいだの マスも ぬる
  let { x, y } = drag.last;
  while (x !== t.x || y !== t.y) {
    if (x !== t.x && (Math.abs(t.x - x) >= Math.abs(t.y - y))) x += Math.sign(t.x - x); else y += Math.sign(t.y - y);
    applyTool(x, y);
  }
  drag.last = t;
});
const endDrag = e => { if (drag && drag.id === e.pointerId) { drag = null; persist(); } };
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

// ---------- おみせ ----------
let shopTab = 'tools';
const stars = (n, max) => '★'.repeat(n) + '☆'.repeat(max - n);
function card({ icon, name, lv, info, btn, disabled, got, onBuy, cls = '' }) {
  const el = document.createElement('div');
  el.className = 'card ' + cls;
  el.innerHTML = `<div class="ic">${icon}</div><div class="nm">${name} <span class="lv">${lv || ''}</span></div><div class="inf">${info}</div><button></button>`;
  const b = el.querySelector('button');
  b.textContent = btn; b.disabled = !!disabled;
  if (got) b.classList.add('got');
  b.addEventListener('click', () => { snd.unlock(); onBuy?.(); });
  return el;
}
function renderShop() {
  $('shopMoney').textContent = save.money.toLocaleString();
  document.querySelectorAll('#shop .tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === shopTab));
  const list = $('shopList');
  list.innerHTML = '';
  const buy = ok => { if (ok) { snd.play('buy'); persist(); renderShop(); updateHud(true); } else snd.play('no'); };
  if (shopTab === 'tools') {
    for (const [k, u] of Object.entries(C.UPGRADES)) {
      const lv = save.up[k], max = u.vals.length - 1, cost = C.upNextCost(save, k);
      const now = u.info(u.vals[lv]);
      list.append(card({
        icon: u.icon, name: u.name, lv: stars(lv + 1, max + 1),
        info: cost === undefined ? `${now}（さいこう！）` : `${now} → <b>${u.info(u.vals[lv + 1])}</b>`,
        btn: cost === undefined ? 'さいこう！' : save.money >= cost ? `${cost}えんで 強く する` : `${cost}えん（あと ${cost - save.money}）`,
        disabled: cost === undefined || save.money < cost, got: cost === undefined,
        onBuy: () => buy(C.buyUpgrade(save, k)),
      }));
    }
  } else if (shopTab === 'base') {
    for (const r of C.ROOMS) {
      const has = save.rooms[r.id];
      list.append(card({
        icon: r.icon, name: r.name, info: r.info,
        btn: has ? 'たてた！' : save.money >= r.cost ? `${r.cost}えんで たてる` : `${r.cost}えん（あと ${r.cost - save.money}）`,
        disabled: has || save.money < r.cost, got: has,
        onBuy: () => { const ok = C.buyRoom(save, r.id); buy(ok); if (ok) roomBuilt(r); },
      }));
    }
  } else {
    if (!save.rooms.pad) {
      const el = document.createElement('p'); el.className = 'note';
      el.textContent = 'まず「きち」で ロケットきちを たてよう。';
      list.append(el);
    }
    C.PARTS.forEach((pt, i) => {
      const done = save.parts > i, next = save.parts === i, tr = C.TREASURES[i];
      const has = save.treasures[i];
      let btn = 'できた！', disabled = true;
      if (!done) {
        if (!next) btn = 'まだ つくれない';
        else if (!save.rooms.pad) btn = 'ロケットきちが いる';
        else if (!has) btn = `たからを さがそう（ふかさ ${tr.y}m）`;
        else { btn = save.money >= pt.cost ? `${pt.cost}えんで つくる` : `${pt.cost}えん（あと ${pt.cost - save.money}）`; disabled = save.money < pt.cost; }
      }
      list.append(card({
        icon: ['🔥', '🛢️', '🚀', '🪟', '🔺'][i], name: `${i + 1}. ${pt.name}`,
        info: `${has ? '✅' : '❓'} たから「${tr.name}」と ${pt.cost}えん`,
        btn, disabled, got: done,
        onBuy: () => { const ok = C.buyPart(save); buy(ok); if (ok) { toast(`ロケットの ${pt.name}が できた！`); snd.play('treasure'); } },
      }));
    });
    if (save.parts >= C.PARTS.length) {
      list.prepend(card({
        icon: '🚀', name: 'ロケット かんせい！', info: save.cleared ? 'もういちど とばして みる？' : 'さあ、うちゅうへ しゅっぱつだ！',
        btn: 'はっしゃ！', cls: 'launch', onBuy: () => { hide('shop'); startLaunch(); },
      }));
    }
  }
}
function roomBuilt(r) {
  toast(`${r.name}が できた！`);
  if (r.id === 'workshop') updateCosts();
  updateHud(true);
}
document.querySelectorAll('#shop .tabs button').forEach(b => b.addEventListener('click', () => { snd.play('tap'); shopTab = b.dataset.tab; renderShop(); }));
$('shopBtn').addEventListener('click', () => {
  snd.unlock(); snd.play('tap');
  if (mode === 'build') setMode('play');
  // やることに あわせて タブを えらぶ
  const n = C.goal(save).n;
  shopTab = n === 3 || n === 5 ? 'base' : n >= 6 ? 'rocket' : 'tools';
  renderShop(); show('shop');
});
document.querySelectorAll('.screen .back').forEach(b => b.addEventListener('click', () => { snd.play('tap'); b.closest('.screen').hidden = true; }));

// ---------- 化石の へや ----------
const FOSSIL_ICON = ['🐚', '🦈', '🪲', '🦴', '🥚', '🦣', '👣', '🐉'];
$('museumBtn').addEventListener('click', () => {
  snd.play('tap'); hide('settings');
  const gr = $('museumGrid'); gr.innerHTML = '';
  C.FOSSILS.forEach((f, i) => {
    const n = save.fossils[i];
    const el = document.createElement('div');
    el.className = 'fossil' + (n ? '' : ' none');
    el.innerHTML = `<div>${FOSSIL_ICON[i]}</div>${n ? f.name : '？？？'}${n > 1 ? ` ×${n}` : ''}`;
    gr.append(el);
  });
  show('museum');
});

// ---------- ポップアップ ----------
let popQueue = [];
function popup(icon, title, text) {
  popQueue.push({ icon, title, text });
  if ($('popup').hidden) nextPopup();
}
function nextPopup() {
  const q = popQueue.shift();
  if (!q) { hide('popup'); return; }
  $('popIcon').textContent = q.icon; $('popTitle').textContent = q.title; $('popText').textContent = q.text;
  show('popup');
}
$('popOk').addEventListener('click', () => { snd.play('tap'); nextPopup(); });

// ---------- せってい ----------
const soundLabel = () => { $('soundBtn').textContent = save.sound ? '🔊 おと：オン' : '🔈 おと：オフ'; };
$('setBtn').addEventListener('click', () => { snd.play('tap'); soundLabel(); show('settings'); });
$('soundBtn').addEventListener('click', () => { save.sound = !save.sound; snd.setOn(save.sound); soundLabel(); persist(); });
$('helpBtn').addEventListener('click', () => { snd.play('tap'); hide('settings'); show('help'); });
$('resetBtn').addEventListener('click', () => { snd.play('tap'); hide('settings'); show('resetAsk'); });
$('resetNo').addEventListener('click', () => { snd.play('tap'); hide('resetAsk'); });
$('resetYes').addEventListener('click', () => {
  resetting = true;
  try { localStorage.removeItem(STORE); } catch { /* なにも しない */ }
  location.reload();
});
$('homeBtn').addEventListener('click', () => { snd.unlock(); if (mode === 'play' && p.y > -0.5) rescue('地上に もどったよ'); });

// ---------- はっしゃ ----------
function startLaunch() {
  setMode('launch');
  launch = { t: 0, off: 0, v: 0 };
  snd.stopBgm();
}
function updateLaunch(dt) {
  const L = launch;
  L.t += dt;
  const c = $('count');
  if (L.t < 3) {
    const n = 3 - Math.floor(L.t);
    if (c.textContent !== String(n)) { c.textContent = n; snd.play('tap'); }
    return;
  }
  if (c.textContent !== '') { c.textContent = ''; snd.play('rumble', 0, 6); snd.play('fanfare'); }
  L.v += dt * (2 + L.v * 0.6);
  L.off += L.v * dt;
  if (Math.random() < 0.8) for (let i = 0; i < 3; i++) parts.push({ x: ROCKET_X + (Math.random() - 0.5) * 2, y: -0.2 - (L.off < 2 ? 0 : L.off - 2), vx: (Math.random() - 0.5) * 6, vy: Math.random() * 2, t: 0, color: '#e5e7eb', big: true });
  if (L.t > 11 && $('ending').hidden) {
    const s = save.stats;
    $('endStats').innerHTML = `<li>ほった マス：${s.dug}</li><li>いちばん ふかい ところ：${s.deepest}m</li><li>かせいだ お金：${Math.round(s.earned).toLocaleString()}えん</li><li>化石：${save.fossils.filter(n => n).length} / ${C.FOSSILS.length}</li>`;
    show('ending');
  }
}
$('endOk').addEventListener('click', () => {
  save.cleared = true; launch = null;
  hide('ending'); persist();
  p.x = C.HOME_X; p.y = -1.8;
  setMode('play'); snd.startBgm();
});
const ROCKET_X = 25.5;

// ---------- HUD ----------
let hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHud(force) {
  if (force) hudCache = {};
  setText('money', Math.floor(save.money).toLocaleString());
  setText('depth', String(Math.max(0, Math.floor(p.y))));
  const cap = C.upVal(save, 'bag'), n = C.bagCount(save);
  setText('bag', `${n}/${cap}`);
  $('bagPill').classList.toggle('full', n >= cap);
  const maxE = C.upVal(save, 'tank');
  $('energy').style.width = `${Math.max(0, p.energy / maxE * 100)}%`;
  $('energyPill').classList.toggle('low', p.energy < maxE * 0.2);
  $('homeBtn').hidden = !save.rooms.teleport;
  $('museumBtn').hidden = !save.rooms.museum;
  const gl = C.goal(save);
  setText('goalText', gl.text);
  if (gl.n !== lastGoal) {
    if (lastGoal >= 0) { $('goal').classList.remove('new'); void $('goal').offsetWidth; $('goal').classList.add('new'); snd.play('buy'); }
    lastGoal = gl.n;
  }
  // おみせで なにか かえる ときは ひからせる
  const canBuy = Object.keys(C.UPGRADES).some(k => C.upNextCost(save, k) !== undefined && save.money >= C.upNextCost(save, k) && save.up[k] < 2)
    || (gl.n === 3 && save.money >= 200) || (gl.n === 5 && save.money >= 1500) || C.partState(save).ok;
  $('shopBtn').classList.toggle('glow', canBuy);
}

// ---------- えを かく ----------
function render() {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = vw / ts, rows = vh / ts;
  const ox = cam.x - cols / 2, oy = cam.y - rows / 2;
  const SX = x => Math.round((x - ox) * ts), SY = y => Math.round((y - oy) * ts);
  const groundY = SY(0);

  g.fillStyle = '#1d1a24'; g.fillRect(0, 0, vw, vh);
  if (groundY > 0) D.drawSky(g, vw, vh, groundY, time, launch ? Math.min(1, Math.max(0, cam.y < -SKY ? (-SKY - cam.y) / 25 : 0)) : 0);

  // 地上の たてもの
  if (groundY > -ts * 6 && groundY < vh + ts * 6) {
    D.drawBase(g, SX(0), groundY, ts, save.rooms, time);
    if (save.rooms.factory) D.drawFactory(g, SX(13.2), groundY, ts, time);
    D.drawRocket(g, SX(ROCKET_X), groundY, ts, save.parts, save.rooms.pad, time, launch && launch.t >= 3 ? Math.min(1, launch.t - 3) : 0, launch ? launch.off * ts : 0);
    D.drawHopper(g, SX(HOPPER.x), SY(HOPPER.y), ts, time, hopperPulse);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.font = `900 ${ts * 0.28}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ホッパー', SX(HOPPER.x + 0.5), SY(HOPPER.y) - ts * 0.3);
  }

  // マス
  const x0 = Math.max(0, Math.floor(ox)), x1 = Math.min(W - 1, Math.ceil(ox + cols));
  const y0 = Math.max(0, Math.floor(oy)), y1 = Math.min(H - 1, Math.ceil(oy + rows));
  for (let y = y0; y <= y1; y++) {
    const bi = C.bandIndex(y), sy = SY(y), sh = SY(y + 1) - sy;
    for (let x = x0; x <= x1; x++) {
      const t = world.tiles[y * W + x], sx = SX(x), sw = SX(x + 1) - sx;
      const v = D.hash(x, y) & 3;
      if (t === T.AIR) g.drawImage(art.get('back', bi, v), sx, sy, sw, sh);
      else if (t === T.TREASURE) { g.drawImage(art.get(C.bandAt(y).rock, bi, v), sx, sy, sw, sh); D.drawTreasure(g, world.treasureAt.get(C.mkey(x, y)) ?? 0, sx + sw / 2, sy + sh / 2, ts, time); }
      else g.drawImage(art.get(t, bi, v), sx, sy, sw, sh);
    }
  }
  // 草
  if (groundY > -ts && groundY < vh) {
    for (let x = x0; x <= x1; x++) if (world.tiles[x] !== T.AIR) {
      g.fillStyle = '#5cb85c'; g.fillRect(SX(x), groundY - ts * 0.06, SX(x + 1) - SX(x), ts * 0.16);
      g.fillStyle = '#7ed957'; g.fillRect(SX(x), groundY - ts * 0.06, SX(x + 1) - SX(x), ts * 0.06);
    }
  }
  // ほった マスの はしを くらく する（あなの かたちが わかるように）
  g.fillStyle = 'rgba(0,0,0,.28)';
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (world.tiles[y * W + x] !== T.AIR) continue;
    const sx = SX(x), sy = SY(y), e = ts * 0.12;
    if (C.solid(world, x, y - 1) && y > 0) g.fillRect(sx, sy, ts, e);
    if (C.solid(world, x - 1, y)) g.fillRect(sx, sy, e, ts);
    if (C.solid(world, x + 1, y)) g.fillRect(sx + ts - e, sy, e, ts);
  }

  // つくる モードで おける ところ
  if (mode === 'build' && tool !== 'hand') {
    for (let y = Math.max(-1, Math.floor(oy)); y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const has = save.machines[C.mkey(x, y)];
      const ok = tool === 'erase' ? !!has : C.canPlace(world, save, tool, x, y);
      if (!ok) continue;
      g.fillStyle = tool === 'erase' ? 'rgba(255,90,90,.35)' : 'rgba(120,255,140,.22)';
      g.fillRect(SX(x) + 2, SY(y) + 2, ts - 4, ts - 4);
    }
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash([6, 5]);
    g.strokeRect(SX(HOPPER.x) + 2, SY(HOPPER.y) + 2, ts - 4, ts - 4); g.setLineDash([]);
  }

  // きかい
  for (const [k, m] of Object.entries(save.machines)) {
    const [x, y] = C.unkey(k);
    if (x < ox - 1 || x > ox + cols + 1 || y < oy - 1 || y > oy + rows + 1) continue;
    if (m.k === 'belt') {
      const nx = flow[k];
      let dir = null;
      if (nx) { const [a, b] = C.unkey(nx); dir = [a - x, b - y]; }
      D.drawBelt(g, SX(x), SY(y), ts, dir, time, !!nx);
    } else {
      const ok = !!C.drillOutlet(flow, x, y);
      D.drawAutoDrill(g, SX(x), SY(y), ts, time, ok, m.buf);
    }
  }
  for (const it of items) if (it.x > ox - 1 && it.x < ox + cols + 1 && it.y > oy - 1 && it.y < oy + rows + 1) D.drawOre(g, it.ore, SX(it.x), SY(it.y) + ts * 0.08, ts * 0.14);
  for (const f of flyers) D.drawOre(g, f.ore, SX(f.x), SY(f.y), ts * 0.16);

  // ほりほりごう
  {
    D.drawPlayer(g, SX(p.x), SY(p.y), ts * 0.95, { face: p.face, dir: p.dig ? p.dig.dir : (keys.down && mode === 'play' ? 'd' : null), drilling: !!p.dig, jet: p.jet, t: time });
    if (p.dig) { // ほる すすみぐあい
      const d = p.dig, e = Math.min(1, d.t / d.time);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = ts * 0.06;
      g.beginPath(); g.arc(SX(d.tx + 0.5), SY(d.ty + 0.5), ts * 0.3, -Math.PI / 2, -Math.PI / 2 + e * Math.PI * 2); g.stroke();
    }
  }

  // つぶ
  for (const q of parts) {
    g.globalAlpha = Math.max(0, 1 - q.t / (q.big ? 2.5 : 0.7));
    g.fillStyle = q.color;
    const r = q.big ? ts * (0.25 + q.t * 0.4) : ts * 0.08;
    g.beginPath(); g.arc(SX(q.x), SY(q.y), r, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;

  // くらさ（ふかいほど くらい。ほりほりごうの まわりは あかるい）
  const depth = Math.max(0, p.y);
  const dark = Math.min(0.72, Math.max(0, (depth - 4) / 70));
  if (dark > 0 && !launch) {
    const px = SX(p.x), py = SY(p.y);
    const gr = g.createRadialGradient(px, py, ts * 2.2, px, py, ts * 6.5);
    gr.addColorStop(0, 'rgba(5,5,15,0)'); gr.addColorStop(1, `rgba(5,5,15,${dark})`);
    g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
  }

  // 見はり台の やじるし
  const gl = C.goal(save);
  if (save.rooms.tower && gl.treasure !== undefined && mode === 'play') {
    for (const [k, i] of world.treasureAt) {
      if (i !== gl.treasure || save.treasures[i]) continue;
      const [tx, ty] = C.unkey(k);
      const dx = tx + 0.5 - p.x, dy = ty + 0.5 - p.y, d = Math.hypot(dx, dy);
      if (d < 3) continue;
      const a = Math.atan2(dy, dx), r = ts * 1.3;
      g.save(); g.translate(SX(p.x) + Math.cos(a) * r, SY(p.y) + Math.sin(a) * r); g.rotate(a);
      g.fillStyle = C.TREASURES[i].color; g.strokeStyle = '#000'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(ts * 0.35, 0); g.lineTo(-ts * 0.15, -ts * 0.22); g.lineTo(-ts * 0.15, ts * 0.22); g.closePath(); g.fill(); g.stroke();
      g.restore();
      g.fillStyle = '#fff'; g.font = `900 ${ts * 0.26}px sans-serif`; g.textAlign = 'center';
      g.fillText(`${Math.round(d)}マス`, SX(p.x) + Math.cos(a) * r * 1.6, SY(p.y) + Math.sin(a) * r * 1.6);
    }
  }

  // うかぶ 字
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const q of pops) {
    g.globalAlpha = Math.max(0, 1 - q.t / 1.2);
    g.font = `900 ${ts * 0.34}px sans-serif`;
    g.lineWidth = ts * 0.08; g.strokeStyle = 'rgba(0,0,0,.6)';
    g.strokeText(q.text, SX(q.x), SY(q.y - q.t * 0.9));
    g.fillStyle = q.color; g.fillText(q.text, SX(q.x), SY(q.y - q.t * 0.9));
  }
  g.globalAlpha = 1;
}

// ---------- ループ ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now; time += dt;
  if (mode === 'play' || mode === 'build') {
    updatePlayer(dt);
    updateEconomy(dt);
    if (p.energy <= 0 && mode === 'play') rescue('でんちが きれた！ 地上に もどったよ');
    saveT += dt;
    if (saveT > 4) { saveT = 0; persist(); }
  } else if (mode === 'launch') {
    updateEconomy(dt);
    updateLaunch(dt);
  }
  hopperPulse = Math.max(0, hopperPulse - dt * 4);
  for (const q of pops) q.t += dt;
  pops = pops.filter(q => q.t < 1.2);
  for (const q of parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.big ? -0.5 : 12) * dt; }
  parts = parts.filter(q => q.t < (q.big ? 2.5 : 0.7));

  // カメラ
  const cols = vw / ts, rows = vh / ts;
  let tx = p.x + camOff.x, ty = p.y + camOff.y;
  if (launch) { tx = ROCKET_X; ty = launch.t < 3 ? -3 : -3 - launch.off; }
  const k = mode === 'build' && drag ? 1 : Math.min(1, dt * 8);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  if (cols >= W) cam.x = W / 2; else cam.x = Math.max(cols / 2, Math.min(W - cols / 2, cam.x));
  if (!launch) cam.y = Math.max(-SKY + rows / 2 - 1.5, Math.min(H - rows / 2, cam.y));
  if (mode === 'build') {
    // うごかしすぎないように
    camOff.x = Math.max(-W, Math.min(W, camOff.x)); camOff.y = Math.max(-H, Math.min(H, camOff.y));
  }

  if (mode !== 'title') updateHud();
  render();
  requestAnimationFrame(frame);
}

// ---------- はじまり ----------
document.querySelectorAll('.version').forEach(el => { el.textContent = `${VERSION} ・ ${UPDATED} こうしん`; });
$('homeLink').addEventListener('click', persist);
$('playBtn').textContent = fresh ? 'あそぶ' : 'つづきから';
$('playBtn').addEventListener('click', () => {
  snd.unlock(); snd.play('tap'); snd.startBgm();
  hide('title'); setMode('play');
  cam.x = p.x; cam.y = p.y;
  if (fresh || save.stats.dug === 0) popup('🚀', 'ロケットを つくって うちゅうへ いこう！', '地面を ほって こうせきを あつめ、ホッパーで 売って お金に しよう。');
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { persist(); snd.stopBgm(); } else if (mode !== 'title' && mode !== 'launch') snd.startBgm(); });
window.addEventListener('pagehide', persist);
cam.x = p.x; cam.y = -3;
$('loading').hidden = true;
requestAnimationFrame(frame);

// テスト用
window.__game = { save, p, toScreen: (x, y) => ({ x: (x - cam.x) * ts + vw / 2, y: (y - cam.y) * ts + vh / 2 }), renderShop, startLaunch, get world() { return world; }, get mode() { return mode; }, keys, setMode, flow: () => flow, items: () => items, reflow: () => { flow = C.computeFlow(save); } };
