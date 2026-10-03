// SHOPCRAFT 本体：そうさ・プレイヤー・HUD・パネル・セーブ。
import {B, BLOCKS, ITEMS, ITEM, CATS, INV_TABS, CUSTOMER_TYPES, REGULARS, REGULAR, CRITERIA, GIFT_VISITS, LEVELS} from './blocks.mjs';
import {World, GROUND} from './world.mjs';
import {Game, SHELF_MAX} from './game.mjs';
import {Renderer} from './render.mjs';
import {Sound} from './audio.mjs';
import {itemURL, faceCanvas} from './textures.mjs';

const $ = id => document.getElementById(id);
const STORE = 'shopcraft-v1';
const DEFAULT_HOTBAR = ['PLANKS', 'LOG', 'GLASS', 'STONE_BRICKS', 'SHELF', 'REGISTER', 'DOOR', 'LANTERN', 'SIGN'].map(k => B[k]);
const REACH = 7.5;
const HW = 0.3, PH = 1.8, EYE = 1.62;

let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { saved = null; }
const prefs = {sound: saved?.sound !== false, music: saved?.music !== false, help: !!saved?.help};

const renderer = new Renderer($('world'));
const sound = new Sound(prefs.sound, prefs.music);
let world, game, player, hotbar, sel = 0;
let mode = 'loading';
let icons = {};
let panelKind = null;

// ---------- せかいの 用意 ----------
function freshPlayer() { return {x: 38.5, y: GROUND, z: 55.5, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: -0.1, onGround: false, flying: false}; }
function newWorld() {
  world = new World();
  world.generate((Math.random() * 1e9) | 0);
  game = new Game(world, {});
  player = freshPlayer();
  hotbar = DEFAULT_HOTBAR.slice();
  sel = 0;
  renderer.setWorld(world);
}
function loadWorld(s) {
  try {
    const w = World.deserialize(s.world);
    if (!w) return false;
    world = w;
    game = new Game(world, s.game || {});
    const p = s.player || {};
    player = {...freshPlayer(), ...pick(p, ['x', 'y', 'z', 'yaw', 'pitch', 'flying'])};
    for (const k of ['x', 'y', 'z', 'yaw', 'pitch']) if (!Number.isFinite(player[k])) player[k] = freshPlayer()[k];
    hotbar = Array.isArray(s.hotbar) && s.hotbar.length === 9 ? s.hotbar.map(id => (BLOCKS[id]?.cat ? id : B.PLANKS)) : DEFAULT_HOTBAR.slice();
    sel = Math.max(0, Math.min(8, s.sel | 0));
    renderer.setWorld(world);
    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
}
const pick = (o, keys) => Object.fromEntries(keys.filter(k => k in o).map(k => [k, o[k]]));

function persist() {
  if (!world || !game) return;
  try {
    localStorage.setItem(STORE, JSON.stringify({
      v: 1, world: world.serialize(), game: game.toJSON(),
      player: pick(player, ['x', 'y', 'z', 'yaw', 'pitch', 'flying']), hotbar, sel,
      sound: sound.on, music: sound.musicOn, help: prefs.help,
    }));
    saved = saved || true;
  } catch (e) { console.warn('save failed', e); }
}

// ---------- プレイヤーの うごき ----------
function collides(x, y, z) {
  const x0 = Math.floor(x - HW), x1 = Math.floor(x + HW - 1e-6);
  const y0 = Math.floor(y), y1 = Math.floor(y + PH - 1e-6);
  const z0 = Math.floor(z - HW), z1 = Math.floor(z + HW - 1e-6);
  for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) if (world.solidForBody(xx, yy, zz)) return true;
  return false;
}
function moveAxis(p, axis, d) {
  if (!d) return false;
  const steps = Math.ceil(Math.abs(d) / 0.3), s = d / steps;
  for (let i = 0; i < steps; i++) {
    p[axis] += s;
    if (collides(p.x, p.y, p.z)) {
      p[axis] -= s;
      let lo = 0, hi = s;
      for (let k = 0; k < 7; k++) {
        const mid = (lo + hi) / 2;
        p[axis] += mid;
        const hit = collides(p.x, p.y, p.z);
        p[axis] -= mid;
        if (hit) hi = mid; else lo = mid;
      }
      p[axis] += lo;
      return true;
    }
  }
  return false;
}

const input = {mx: 0, mz: 0, jump: false, down: false, keys: new Set(), lastJumpTap: 0};
function updatePlayer(dt) {
  const p = player;
  // 体が うまっていたら 上に だす
  for (let k = 0; k < 40 && collides(p.x, p.y, p.z); k++) p.y += 0.5;
  let mx = input.mx, mz = input.mz;
  const K = input.keys;
  if (K.has('KeyW') || K.has('ArrowUp')) mz += 1;
  if (K.has('KeyS') || K.has('ArrowDown')) mz -= 1;
  if (K.has('KeyA') || K.has('ArrowLeft')) mx -= 1;
  if (K.has('KeyD') || K.has('ArrowRight')) mx += 1;
  const mag = Math.hypot(mx, mz);
  if (mag > 1) { mx /= mag; mz /= mag; }
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  const speed = p.flying ? 8.5 : 4.4;
  const tx = (fx * mz + rx * mx) * speed, tz = (fz * mz + rz * mx) * speed;
  const a = Math.min(1, dt * (p.onGround || p.flying ? 14 : 5));
  p.vx += (tx - p.vx) * a; p.vz += (tz - p.vz) * a;
  const jump = input.jump || K.has('Space'), down = input.down || K.has('ShiftLeft') || K.has('ShiftRight');
  if (p.flying) {
    const ty = (jump ? 1 : 0) * 7 - (down ? 1 : 0) * 7;
    p.vy += (ty - p.vy) * Math.min(1, dt * 10);
  } else {
    p.vy = Math.max(-40, p.vy - 28 * dt);
    if (jump && p.onGround) p.vy = 8.6;
  }
  const hx = moveAxis(p, 'x', p.vx * dt);
  const hz = moveAxis(p, 'z', p.vz * dt);
  const falling = p.vy < 0;
  const hy = moveAxis(p, 'y', p.vy * dt);
  p.onGround = hy && falling;
  if (hy) { if (p.flying && falling) setFly(false); p.vy = 0; }
  // 1だんなら 自動で ジャンプ
  if ((hx || hz) && p.onGround && mag > 0.2 && !p.flying) {
    const dx = Math.sign(tx) * 0.4, dz = Math.sign(tz) * 0.4;
    if (!collides(p.x, p.y + 1.1, p.z) && !collides(p.x + (hx ? dx : 0), p.y + 1.1, p.z + (hz ? dz : 0))) p.vy = 8.6;
  }
  p.x = Math.max(0.4, Math.min(world.w - 0.4, p.x));
  p.z = Math.max(0.4, Math.min(world.d - 0.4, p.z));
  if (p.y > world.h + 10) p.y = world.h + 10;
}
function setFly(on) {
  player.flying = on;
  if (on) player.vy = 3;
  $('btnFly').classList.toggle('on', on);
  $('btnDown').hidden = !on;
}

function eye() { return {x: player.x, y: player.y + EYE, z: player.z}; }
function aim(sx, sy) {
  const r = $('world').getBoundingClientRect();
  const d = renderer.rayFromScreen(sx - r.left, sy - r.top, r.width, r.height);
  const e = eye();
  return world.raycast(e.x, e.y, e.z, d.x, d.y, d.z, REACH);
}
function facingMeta() {
  const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw); // プレイヤーの ほうを むく
  if (Math.abs(fx) > Math.abs(fz)) return fx > 0 ? 1 : 3;
  return fz > 0 ? 0 : 2;
}
function bodyHits(x, y, z) {
  return player.x + HW > x && player.x - HW < x + 1 && player.z + HW > z && player.z - HW < z + 1 && player.y + PH > y && player.y < y + 1;
}

// タップ：さわる か おく
function customerOnRay(sx, sy, maxT) {
  const r = $('world').getBoundingClientRect();
  const d = renderer.rayFromScreen(sx - r.left, sy - r.top, r.width, r.height);
  const e = eye();
  let best = null, bt = maxT;
  for (const c of game.customers) {
    const sc = c.look.scale || 1;
    const t = (c.x - e.x) * d.x + (c.y + 0.9 * sc - e.y) * d.y + (c.z - e.z) * d.z;
    if (t < 0 || t > bt) continue;
    const px = e.x + d.x * t, py = e.y + d.y * t, pz = e.z + d.z * t;
    if (Math.hypot(px - c.x, pz - c.z) < 0.45 * sc + 0.1 && py > c.y - 0.1 && py < c.y + 1.95 * sc) { best = c; bt = t; }
  }
  return best;
}
function tapAt(sx, sy) {
  const hit = aim(sx, sy);
  const who = customerOnRay(sx, sy, hit ? hit.dist + 0.5 : 12);
  if (who) { game.greet(who); handleEvents(game.takeEvents()); sound.pop(); return; }
  if (!hit) return;
  const id = hit.id;
  const i = world.idx(hit.x, hit.y, hit.z);
  if (id === B.SHELF) return openShelf(i);
  if (id === B.REGISTER) return openReport(i);
  if (id === B.SIGN) return openSign(i);
  const block = hotbar[sel];
  if (!block || !game.blockAvailable(block)) return;
  let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (world.replaceable(hit.x, hit.y, hit.z)) { x = hit.x; y = hit.y; z = hit.z; }
  const b = BLOCKS[block];
  if (b.solid && bodyHits(x, y, z)) return;
  if (block === B.DOOR && bodyHits(x, y + 1, z)) return;
  if (game.placeBlock(x, y, z, block, b.faced ? facingMeta() : 0)) {
    sound.place();
    renderer.swing();
    if (block === B.SIGN) setTimeout(() => openSign(world.idx(x, y, z)), 120);
  }
}
function breakAt(sx, sy) {
  const hit = aim(sx, sy);
  if (!hit) return false;
  const id = game.breakBlock(hit.x, hit.y, hit.z);
  if (id) { renderer.breakBurst(hit.x, hit.y, hit.z, id); renderer.swing(); sound.break(); return true; }
  return false;
}

// ---------- タッチ・マウス ----------
const pointers = new Map();
const HOLD = 0.32, REPEAT = 0.28, MOVE_TOL = 12;
const canvas = $('world');
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (mode !== 'play') return;
  sound.init();
  canvas.setPointerCapture?.(e.pointerId);
  const r = canvas.getBoundingClientRect();
  const inStick = e.clientX - r.left < r.width * 0.34 && e.clientY - r.top > r.height * 0.42;
  if (inStick && ![...pointers.values()].some(p => p.kind === 'stick')) {
    pointers.set(e.pointerId, {kind: 'stick', ox: e.clientX, oy: e.clientY});
    const st = $('stick');
    st.style.left = (e.clientX - r.left - 68) + 'px';
    st.style.top = (e.clientY - r.top - 68) + 'px';
    st.style.bottom = 'auto';
    return;
  }
  if (e.pointerType === 'mouse' && e.button === 2) { tapAt(e.clientX, e.clientY); return; }
  pointers.set(e.pointerId, {kind: 'look', sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), t: 0, moved: false, holding: false, next: 0});
});
canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (p.kind === 'stick') {
    let dx = e.clientX - p.ox, dy = e.clientY - p.oy;
    const d = Math.hypot(dx, dy), R = 56;
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    $('knob').style.transform = `translate(${dx}px,${dy}px)`;
    const dead = 0.12;
    const nx = dx / R, ny = -dy / R;
    input.mx = Math.abs(nx) < dead ? 0 : nx;
    input.mz = Math.abs(ny) < dead ? 0 : ny;
    return;
  }
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (!p.moved && !p.holding && Math.hypot(p.x - p.sx, p.y - p.sy) > MOVE_TOL) p.moved = true;
  if (p.moved) {
    const s = e.pointerType === 'mouse' ? 0.005 : 0.0062;
    player.yaw -= dx * s;
    player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch - dy * s));
  }
});
const endPointer = e => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  pointers.delete(e.pointerId);
  if (p.kind === 'stick') {
    input.mx = input.mz = 0;
    $('knob').style.transform = '';
    const st = $('stick');
    st.style.left = st.style.top = st.style.bottom = '';
    return;
  }
  if (e.type === 'pointerup' && !p.moved && !p.holding) {
    if ((performance.now() - p.t0) / 1000 < HOLD) tapAt(p.x, p.y);
    else breakAt(p.x, p.y);
  }
  renderer.setTarget(null);
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function updateHold() {
  let shown = false;
  const now = performance.now();
  for (const p of pointers.values()) {
    if (p.kind !== 'look' || p.moved) continue;
    const t = (now - p.t0) / 1000;
    const hit = aim(p.x, p.y);
    if (!p.holding) {
      if (t > 0.08) { renderer.setTarget(hit, Math.min(1, t / HOLD)); shown = true; }
      if (t >= HOLD) { p.holding = true; breakAt(p.x, p.y); p.next = t + REPEAT; }
    } else {
      renderer.setTarget(hit, 1 - Math.max(0, p.next - t) / REPEAT); shown = true;
      if (t >= p.next) { breakAt(p.x, p.y); p.next = t + REPEAT; }
    }
  }
  if (!shown && !pointers.size) renderer.setTarget(null);
}

// ボタン（おしている あいだ）
function holdButton(el, on, off) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); sound.init(); on(); });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(t, () => off());
}
holdButton($('btnJump'), () => {
  const now = performance.now();
  if (now - input.lastJumpTap < 300) setFly(!player.flying);
  input.lastJumpTap = now;
  input.jump = true;
}, () => { input.jump = false; });
holdButton($('btnDown'), () => { input.down = true; }, () => { input.down = false; });
$('btnFly').addEventListener('click', () => { sound.tap(); setFly(!player.flying); });

window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === 'Escape' && mode === 'panel') return closePanel();
  if (mode !== 'play') return;
  sound.init();
  input.keys.add(e.code);
  if (e.code === 'Space') {
    const now = performance.now();
    if (!e.repeat && now - input.lastJumpTap < 300) setFly(!player.flying);
    if (!e.repeat) input.lastJumpTap = now;
    e.preventDefault();
  }
  if (e.code === 'KeyF') setFly(!player.flying);
  if (e.code === 'KeyE') openInventory();
  if (/^Digit[1-9]$/.test(e.code)) selectSlot(+e.code.slice(5) - 1);
});
window.addEventListener('keyup', e => input.keys.delete(e.code));
window.addEventListener('blur', () => { input.keys.clear(); input.jump = input.down = false; });
document.addEventListener('gesturestart', e => e.preventDefault());

// ---------- ホットバー ----------
function buildHotbar() {
  const bar = $('hotbar');
  bar.innerHTML = '';
  hotbar.forEach((id, i) => {
    const s = document.createElement('button');
    s.className = 'slot' + (i === sel ? ' sel' : '');
    s.innerHTML = `<img alt="" src="${icons[id] || ''}">`;
    s.addEventListener('pointerdown', e => { e.stopPropagation(); selectSlot(i); });
    bar.appendChild(s);
  });
}
let selNameTimer = 0;
function selectSlot(i) {
  sel = i;
  [...$('hotbar').children].forEach((s, k) => s.classList.toggle('sel', k === sel));
  let n = $('selName');
  if (!n) { n = document.createElement('div'); n.id = 'selName'; $('hotbarWrap').appendChild(n); }
  n.textContent = BLOCKS[hotbar[sel]]?.name || '';
  n.style.opacity = 1;
  selNameTimer = 1.6;
  sound.tap();
}
$('btnInv').addEventListener('click', () => openInventory());

// ---------- ふきだし・名前 ----------
const labels = new Map(); // id -> {bubble, until, tag}
const popups = [];
function showBubble(id, text, item) {
  let L = labels.get(id);
  if (!L) { L = {}; labels.set(id, L); }
  L.bubble?.remove();
  const el = document.createElement('div');
  el.className = 'bubble' + (text === '入れない…' || text.endsWith('…') ? ' sad' : '') + (text.includes('プレゼント') ? ' gift' : '');
  if (item) { const img = document.createElement('img'); img.src = itemURL(item); el.appendChild(img); }
  el.appendChild(document.createTextNode(text));
  $('labels').appendChild(el);
  L.bubble = el;
  L.until = performance.now() + 2800;
}
function popup(x, y, z, html) {
  const el = document.createElement('div');
  el.className = 'popup';
  el.innerHTML = html;
  $('labels').appendChild(el);
  popups.push({el, x, y, z, until: performance.now() + 1400});
}
function updateLabels() {
  const W = innerWidth, H = innerHeight, now = performance.now();
  const ids = new Set();
  for (const c of game.customers) {
    ids.add(c.id);
    let L = labels.get(c.id);
    const d = Math.hypot(c.x - player.x, c.z - player.z);
    const sc = c.look.scale || 1;
    if (L?.bubble) {
      const p = d < 30 ? renderer.project(c.x, c.y + 2.25 * sc + 0.15, c.z, W, H) : null;
      if (!p || now > L.until) { if (now > L.until) { L.bubble.remove(); L.bubble = null; } else L.bubble.style.visibility = 'hidden'; }
      else { L.bubble.style.visibility = ''; L.bubble.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`; }
    }
    if (c.regular) {
      if (!L) { L = {}; labels.set(c.id, L); }
      if (!L.tag) {
        L.tag = document.createElement('div');
        L.tag.className = 'nametag';
        const v = game.regulars[c.regular]?.visits || 0;
        L.tag.innerHTML = `${c.name}<i>${'♥'.repeat(Math.min(GIFT_VISITS, v))}</i>`;
        $('labels').appendChild(L.tag);
      }
      const p = d < 22 && !L.bubble ? renderer.project(c.x, c.y + 2.1 * sc, c.z, W, H) : null;
      if (p) { L.tag.style.display = ''; L.tag.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`; }
      else L.tag.style.display = 'none';
    }
  }
  for (const [id, L] of labels) if (!ids.has(id)) { L.bubble?.remove(); L.tag?.remove(); labels.delete(id); }
  for (let i = popups.length - 1; i >= 0; i--) {
    const q = popups[i];
    const p = renderer.project(q.x, q.y, q.z, W, H);
    if (now > q.until) { q.el.remove(); popups.splice(i, 1); continue; }
    if (p) q.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
    else q.el.style.visibility = 'hidden';
  }
}

// ---------- お知らせ ----------
const toastSeen = new Map();
function toast(html, cls = '', key = null, every = 0) {
  if (key) {
    const t = toastSeen.get(key) || -1e9;
    if (performance.now() - t < every * 1000) return;
    toastSeen.set(key, performance.now());
  }
  const box = $('toasts');
  while (box.children.length > 2) box.firstChild.remove();
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.innerHTML = html;
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3700);
}
let bannerTimer = 0;
function banner(small, big, sub) {
  $('bannerSmall').textContent = small;
  $('bannerBig').textContent = big;
  $('bannerSub').textContent = sub;
  $('bannerSub').hidden = !sub;
  const b = $('banner');
  b.hidden = true; void b.offsetWidth; b.hidden = false;
  bannerTimer = 3.6;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const coinHTML = n => `<span class="price"><i class="coin"></i>${n}</span>`;

function handleEvents(list) {
  for (const e of list) {
    const c = e.id != null ? game.customers.find(k => k.id === e.id) : null;
    const near = c ? Math.hypot(c.x - player.x, c.z - player.z) < 26 : true;
    switch (e.type) {
      case 'bubble':
        showBubble(e.id, e.text, e.item);
        if (near && e.text.endsWith('…')) sound.sad();
        break;
      case 'sale':
        renderer.coins(e.x, e.y, e.z);
        popup(e.x, e.y + 0.4, e.z, `+${e.amount + e.tip}` + (e.tip ? ` <small>チップ ${e.tip}</small>` : ''));
        sound.coin();
        break;
      case 'take': if (near) sound.pop(); break;
      case 'door': if (near) sound.bell(); break;
      case 'level': {
        const newTypes = Object.values(CUSTOMER_TYPES).filter(t => t.level === e.level).map(t => t.name);
        banner('町が 大きく なった！', `レベル ${e.level}`, [newTypes.length ? `${newTypes.join('・')}が 来るように なった！` : '', e.house ? '新しい 家が 立ったよ' : ''].filter(Boolean).join(' '));
        renderer.sparkle(player.x, player.y + 1.5, player.z);
        sound.fanfare();
        break;
      }
      case 'gift': {
        const id = B[e.block];
        toast(`<img src="${icons[id] || ''}" alt="">${esc(e.name)}から プレゼント！ 「${esc(BLOCKS[id].name)}」`, '', null);
        sound.gift();
        $('btnInv').classList.add('alert');
        break;
      }
      case 'goal':
        toast(`やること クリア！ ${coinHTML('+' + e.reward)}`);
        $('goal').classList.remove('done'); void $('goal').offsetWidth; $('goal').classList.add('done');
        sound.buy();
        break;
      case 'hint': toast(esc(e.text), 'hint', e.text, 20); break;
      case 'missing': {
        const it = ITEM[e.item];
        const how = game.unlocked.has(e.item) ? 'たなに ならべよう' : '仕入れで 買えるよ';
        toast(`<img src="${itemURL(e.item)}" alt="">「${esc(it.name)}」が ほしかった みたい。${how}`, 'hint', 'miss:' + e.item, 40);
        break;
      }
      case 'soldOut': toast(`<img src="${itemURL(e.item)}" alt="">たなが からっぽ！ タップして ほじゅう`, 'hint', 'empty', 25); break;
    }
  }
}

// ---------- HUD ----------
let shownCoins = 0;
function updateHud(dt) {
  const target = game.coins;
  shownCoins += (target - shownCoins) * Math.min(1, dt * 8);
  if (Math.abs(target - shownCoins) < 0.5) shownCoins = target;
  $('coins').textContent = Math.round(shownCoins).toLocaleString();
  const lvl = game.level, lo = LEVELS[lvl - 1], hi = LEVELS[lvl];
  $('level').textContent = `レベル${lvl}`;
  $('levelBar').style.width = hi ? `${Math.min(100, (game.totalSales - lo) / (hi - lo) * 100)}%` : '100%';
  const st = game.bestStars();
  $('stars').textContent = '★'.repeat(st) + '☆'.repeat(5 - st);
  const g = game.currentGoal();
  $('goal').hidden = !g;
  if (g) $('goalText').textContent = g.text;
  $('btnStock').classList.toggle('alert', ITEMS.some(it => game.canUnlock(it.key)));
  if (selNameTimer > 0) { selNameTimer -= dt; if (selNameTimer <= 0 && $('selName')) $('selName').style.opacity = 0; }
  if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) $('banner').hidden = true; }
}

// ---------- パネル ----------
function openPanel(kind, title, render) {
  panelKind = kind;
  mode = 'panel';
  input.mx = input.mz = 0; input.jump = input.down = false; input.keys.clear();
  for (const p of pointers.values()) if (p.kind === 'stick') { $('knob').style.transform = ''; }
  pointers.clear();
  renderer.setTarget(null);
  $('panelTitle').textContent = title;
  $('panel').hidden = false;
  $('panelBody').innerHTML = '';
  $('panelBody').scrollTop = 0;
  render($('panelBody'));
  sound.tap();
}
function closePanel() {
  $('panel').hidden = true;
  panelKind = null;
  if (mode === 'panel') mode = 'play';
  buildHotbar();
}
$('panelClose').addEventListener('click', closePanel);
$('panel').addEventListener('pointerdown', e => { if (e.target === $('panel')) closePanel(); });
const h = (tag, cls, html) => { const el = document.createElement(tag); if (cls) el.className = cls; if (html != null) el.innerHTML = html; return el; };

let invTab = 'build';
function openInventory() {
  $('btnInv').classList.remove('alert');
  openPanel('inv', 'もちもの', body => renderInventory(body));
}
function renderInventory(body) {
  body.innerHTML = '';
  body.appendChild(h('p', 'note', 'えらんだ ブロックが 下の わくに 入るよ。'));
  const mini = h('div', 'mini-bar');
  hotbar.forEach((id, i) => {
    const s = h('button', 'slot' + (i === sel ? ' sel' : ''), `<img alt="" src="${icons[id] || ''}">`);
    s.addEventListener('click', () => { sel = i; renderInventory(body); sound.tap(); });
    mini.appendChild(s);
  });
  body.appendChild(mini);
  const tabs = h('div', 'tabs');
  for (const t of INV_TABS) {
    const b = h('button', 'tab' + (t.key === invTab ? ' on' : ''), t.name);
    b.addEventListener('click', () => { invTab = t.key; renderInventory(body); sound.tap(); });
    tabs.appendChild(b);
  }
  body.appendChild(tabs);
  const grid = h('div', 'grid');
  for (const b of BLOCKS) {
    if (!b || b.cat !== invTab) continue;
    const ok = game.blockAvailable(b.id);
    const cell = h('button', 'cell' + (ok ? '' : ' locked'), ok ? `<img alt="" src="${icons[b.id] || ''}"><span>${esc(b.name)}</span>` : '<b style="font-size:30px">？</b><span>じょうれんさんの<br>プレゼント</span>');
    if (ok) cell.addEventListener('click', () => {
      hotbar[sel] = b.id;
      sound.place();
      renderInventory(body);
      body.querySelectorAll('.cell')[[...BLOCKS].filter(x => x && x.cat === invTab).indexOf(b)]?.classList.add('flash');
    });
    grid.appendChild(cell);
  }
  body.appendChild(grid);
}

function openShelf(idx) {
  const s = world.shelves.get(idx);
  if (!s) return;
  openPanel('shelf', 'たな', body => {
    game.shops();
    const it = s.item ? ITEM[s.item] : null;
    body.appendChild(h('p', 'note', it ? `いまは 「${esc(it.name)}」 のこり ${s.stock}こ。えらぶと ${SHELF_MAX}こ ならぶよ。` : `ならべる 品物を えらんでね。${SHELF_MAX}こ ならぶよ。`));
    if (s.shop == null) body.appendChild(h('p', 'hints', '<div>近くに レジが ないと 売れないよ（8マス いない）</div>'));
    const grid = h('div', 'grid');
    for (const item of ITEMS) {
      if (!game.unlocked.has(item.key)) continue;
      const cell = h('button', 'cell', `<img alt="" src="${itemURL(item.key)}"><span>${esc(item.name)}</span>${coinHTML(item.price)}`);
      cell.addEventListener('click', () => { game.stockShelf(idx, item.key); sound.place(); closePanel(); });
      grid.appendChild(cell);
    }
    body.appendChild(grid);
    const act = h('div', 'card-actions');
    const more = h('button', 'btn gold', '仕入れで 品物を ふやす');
    more.addEventListener('click', () => { closePanel(); openStock(); });
    act.appendChild(more);
    if (s.item) {
      const clr = h('button', 'btn', 'からに する');
      clr.addEventListener('click', () => { game.clearShelf(idx); closePanel(); });
      act.appendChild(clr);
    }
    body.appendChild(act);
  });
}

function openStock() {
  openPanel('stock', '仕入れ', body => renderStock(body));
}
function renderStock(body) {
  body.innerHTML = '';
  const missed = game.topMissed(4);
  if (missed.length) body.appendChild(h('div', 'wants', 'お客さんが ほしがった 物：' + missed.map(k => `<img alt="" src="${itemURL(k)}">`).join('')));
  body.appendChild(h('p', 'note', `コインを つかって 新しい 品物を 売れるように する。もっている コイン：${game.coins}`));
  const list = h('div', 'list');
  for (const it of [...ITEMS].sort((a, b) => a.level - b.level || a.cost - b.cost)) {
    const have = game.unlocked.has(it.key);
    const row = h('div', 'row' + (have ? ' have' : ''));
    row.innerHTML = `<img alt="" src="${itemURL(it.key)}"><div class="grow"><b>${esc(it.name)}</b><span>${CATS[it.cat]} ・ 売ると ${it.price}コイン</span></div>`;
    let btn;
    if (have) btn = h('button', 'btn', 'もってる');
    else if (game.level < it.level) btn = h('button', 'btn', `町レベル${it.level}`);
    else btn = h('button', 'btn gold', coinHTML(it.cost));
    btn.disabled = have || !game.canUnlock(it.key);
    if (!btn.disabled) btn.addEventListener('click', () => {
      if (game.unlock(it.key)) { sound.buy(); toast(`<img src="${itemURL(it.key)}" alt="">「${esc(it.name)}」を 仕入れた！ たなに ならべよう`); renderStock(body); }
    });
    row.appendChild(btn);
    list.appendChild(row);
  }
  body.appendChild(list);
}

function starsText(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
function openReport(regIdx = null) {
  openPanel('report', '店の ひょうか', body => renderReport(body, regIdx));
}
function renderReport(body, regIdx) {
  body.innerHTML = '';
  const shops = [...game.shops()].sort((a, b) => (a.i === regIdx ? -1 : b.i === regIdx ? 1 : b.stars - a.stars));
  if (!shops.length) { body.appendChild(h('p', 'hints', '<div>レジを おくと 店に なるよ。レジの まわり 8マスが 店だよ。</div>')); return; }
  body.appendChild(h('p', 'note', `★が 多い 店ほど お客さんが たくさん 来るよ。売った 品物：${game.stats.sold}こ`));
  for (const s of shops) {
    const card = h('div', 'shop-card');
    card.appendChild(h('h3', '', `${s.name ? esc(s.name) : '名前の ない 店'} <span class="st">${starsText(s.stars)}</span>`));
    const crit = h('div', 'crit');
    for (const c of CRITERIA) {
      const v = s.scores[c.key];
      crit.appendChild(h('span', '', c.name));
      crit.appendChild(h('div', 'bar', `<i class="${v < 0.5 ? 'low' : ''}" style="width:${Math.round(v * 100)}%"></i>`));
    }
    card.appendChild(crit);
    if (s.hints.length) card.appendChild(h('div', 'hints', s.hints.slice(0, 2).map(t => `<div>${t}</div>`).join('')));
    const missed = game.topMissed(4);
    if (missed.length && s === shops[0]) card.appendChild(h('div', 'wants', 'お客さんが ほしがった 物：' + missed.map(k => `<img alt="" src="${itemURL(k)}" title="${esc(ITEM[k].name)}">`).join('')));
    const act = h('div', 'card-actions');
    const empty = s.shelves.filter(si => { const sh = world.shelves.get(si); return sh.item && sh.stock < SHELF_MAX; }).length;
    const fill = h('button', 'btn primary', `たなを ぜんぶ ほじゅう（${empty}）`);
    fill.disabled = !empty;
    fill.addEventListener('click', () => { if (game.refillShop(s.i)) { sound.place(); renderReport(body, regIdx); } });
    act.appendChild(fill);
    card.appendChild(act);
    body.appendChild(card);
  }
}

function openBook() {
  openPanel('book', 'お客さん ちょう', body => {
    body.appendChild(h('p', 'note', `じょうれんさんが ${GIFT_VISITS}回 買い物を すると プレゼントを くれるよ。`));
    const grid = h('div', 'book');
    for (const r of REGULARS) {
      const rec = game.regulars[r.key];
      const type = CUSTOMER_TYPES[r.type];
      const met = rec && rec.visits > 0;
      const card = h('div', 'person' + (met ? '' : ' unknown'));
      const look = {...type.look, ...(r.look || {})};
      const cv = faceCanvas(met ? look : {skin: '#6a6a6a', hair: '#4a4a4a'});
      card.appendChild(cv);
      if (met) {
        const v = Math.min(GIFT_VISITS, rec.visits);
        const gift = BLOCKS[B[r.gift]];
        card.appendChild(h('b', '', esc(r.name)));
        card.appendChild(h('span', '', `${type.name} ・ ${rec.visits}回`));
        card.appendChild(h('div', 'hearts', '♥'.repeat(v) + '♡'.repeat(GIFT_VISITS - v)));
        card.appendChild(h('span', '', rec.gifted ? `プレゼント：${esc(gift.name)}` : `あと ${GIFT_VISITS - rec.visits}回で プレゼント`));
      } else {
        card.appendChild(h('b', '', '？？？'));
        card.appendChild(h('span', '', game.level < type.level ? `町レベル${type.level}で 来る` : `${type.name}。まだ 会って いない`));
      }
      grid.appendChild(card);
    }
    body.appendChild(grid);
  });
}

const SIGN_PRESETS = ['パン屋', 'ぶき屋', 'ぼうぐ屋', 'まほう屋', 'なんでも屋', 'りょうり屋', 'おかし屋', '本屋'];
function openSign(idx) {
  if (!world.signs.has(idx)) return;
  openPanel('sign', 'かんばん', body => {
    body.appendChild(h('p', 'note', '店の 名前を 書こう（12文字まで）'));
    const inp = h('input', 'sign-input');
    inp.maxLength = 12;
    inp.value = world.signs.get(idx) || '';
    inp.placeholder = 'たとえば ぼくの ぶき屋';
    body.appendChild(inp);
    const chips = h('div', 'chips');
    for (const t of SIGN_PRESETS) {
      const b = h('button', 'tab', t);
      b.addEventListener('click', () => { inp.value = t; sound.tap(); });
      chips.appendChild(b);
    }
    body.appendChild(chips);
    const ok = h('button', 'btn primary', 'これに する');
    ok.style.width = '100%';
    ok.addEventListener('click', () => { game.setSign(idx, inp.value); sound.place(); closePanel(); });
    body.appendChild(ok);
  });
}

function openMenu() {
  openPanel('menu', 'メニュー', body => {
    const list = h('div', 'list');
    const mk = (label, fn, cls = '') => { const b = h('button', 'btn ' + cls, label); b.addEventListener('click', fn); list.appendChild(b); return b; };
    const sb = mk(`こうか音：${sound.on ? 'オン' : 'オフ'}`, () => { sound.on = !sound.on; sb.textContent = `こうか音：${sound.on ? 'オン' : 'オフ'}`; persist(); });
    const mb = mk(`音楽：${sound.musicOn ? 'オン' : 'オフ'}`, () => { sound.musicOn = !sound.musicOn; mb.textContent = `音楽：${sound.musicOn ? 'オン' : 'オフ'}`; persist(); });
    mk('あそびかた', () => { closePanel(); showHelp(); });
    mk('ほぞんして タイトルへ', () => { persist(); closePanel(); toTitle(); }, 'gold');
    body.appendChild(list);
  });
}

$('btnStock').addEventListener('click', openStock);
$('btnReport').addEventListener('click', () => openReport());
$('btnStars').addEventListener('click', () => openReport());
$('btnBook').addEventListener('click', openBook);
$('btnMenu').addEventListener('click', openMenu);

function showHelp() {
  mode = 'help';
  $('help').hidden = false;
}
$('btnHelpOk').addEventListener('click', () => {
  $('help').hidden = true;
  prefs.help = true;
  if (!$('title').hidden) mode = 'title';
  else { mode = 'play'; persist(); }
});

// ---------- タイトル ----------
function toTitle() {
  mode = 'title';
  $('title').hidden = false;
  $('hud').hidden = true;
  $('controls').hidden = true;
  $('btnNew').hidden = !saved;
  $('btnPlay').textContent = saved ? 'つづきから' : 'あそぶ';
}
function startPlay() {
  sound.init();
  $('title').hidden = true;
  $('hud').hidden = false;
  $('controls').hidden = false;
  buildHotbar();
  setFly(player.flying);
  mode = 'play';
  if (!prefs.help) showHelp();
}
$('btnPlay').addEventListener('click', () => { startPlay(); });
let newConfirm = false;
$('btnNew').addEventListener('click', () => {
  if (!newConfirm) { newConfirm = true; $('btnNew').textContent = 'いまの せかいが きえるよ。いい？'; return; }
  newConfirm = false;
  $('btnNew').textContent = '新しい せかい';
  newWorld();
  persist();
  saved = true;
  startPlay();
});
$('btnHow').addEventListener('click', () => { sound.init(); showHelp(); });

document.addEventListener('visibilitychange', () => { if (document.hidden && world && mode !== 'title') persist(); });
window.addEventListener('pagehide', () => { if (world && mode !== 'title') persist(); });

// ---------- ループ ----------
function resize() { renderer.resize(innerWidth, innerHeight); }
window.addEventListener('resize', resize);
resize();

let last = performance.now(), saveTimer = 0, hudTimer = 0, titleT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (mode === 'play') {
    updatePlayer(dt);
    game.update(dt);
    handleEvents(game.takeEvents());
    updateHold();
    saveTimer += dt;
    if (saveTimer > 15) { saveTimer = 0; persist(); }
  }
  const cam = renderer.camera;
  if (mode === 'title' || (mode === 'help' && $('hud').hidden)) {
    titleT += dt * 0.08;
    cam.position.set(40 + Math.sin(titleT) * 24, GROUND + 13, 46 + Math.cos(titleT) * 24);
    cam.lookAt(40, GROUND + 2, 45);
  } else {
    cam.position.set(player.x, player.y + EYE, player.z);
    cam.rotation.set(player.pitch, player.yaw, 0);
  }
  renderer.setHeld(mode === 'play' || mode === 'panel' ? hotbar[sel] : null, Math.hypot(player.vx, player.vz));
  renderer.update(dt, game.customers, [player, ...game.customers]);
  renderer.render();
  if (mode !== 'title') updateLabels();
  hudTimer += dt;
  if (mode !== 'title') updateHud(dt);
  sound.music(dt);
  requestAnimationFrame(frame);
}

// ---------- はじめる ----------
function boot() {
  if (!(saved && saved.world && loadWorld(saved))) { saved = null; newWorld(); }
  const ids = BLOCKS.filter(b => b && b.cat).map(b => b.id);
  icons = renderer.blockIcons(ids);
  $('loading').hidden = true;
  toTitle();
  requestAnimationFrame(t => { last = t; frame(t); });
  // テスト用
  window.__shopcraft = {get world() { return world; }, get game() { return game; }, get player() { return player; }, renderer, tapAt, breakAt, openShelf, openReport, openStock, openBook, openInventory, startPlay, get mode() { return mode; }};
}
boot();
