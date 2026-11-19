// ほうかご：ぷにゅの へやを かざる → ともだちが あそびに くる → ねる
import { ITEMS, ROOM, WALLS, FLOORS } from '../fushigi-pet-hotel/data.mjs';
import { drawItem, drawWall, drawFloor, depth } from '../fushigi-pet-hotel/draw.mjs';
import { itemDef, clampItem, buy, takeOut, stored, putAway, recolor, priceOf, friendComments, friendLoves } from './core.mjs';
import { SHOP, FREE_WALLS, FREE_FLOORS, CLASSMATES } from './data.mjs';
import { G, V, button, hitArea, talk, talking, panel, hud, drawPunyu, drawCreature, text, emoji, rr, circ, ell, burst, floatText, showBanner, inRect, stickerIcon, clamp, lerp, drawSpeech } from './ui.mjs';
import { drawHomeRoom, drawFramedPic } from './art.mjs';

export const HOME = {};
const PINK = { color: '#ff7aa8', ink: '#fff', shadow: '#d9507e' };
const DRAWER_H = 150;

// かぐの あたりはんい（へやの ざひょう）
function boxOf(it) {
  const d = itemDef(it.id);
  if (d.zone === 'wall') return { x: it.x - d.w / 2, y: it.y - d.h / 2, w: d.w, h: d.h };
  const k = depth(it.y);
  if (d.flat) return { x: it.x - d.w / 2 * k, y: it.y - d.h / 2 * k, w: d.w * k, h: d.h * k };
  return { x: it.x - d.w / 2 * k, y: it.y - d.h * k, w: d.w * k, h: d.h * k + 8 };
}
// うえに みえる じゅんに（たたみ）
function pickItem(room, q) {
  const floor = room.items.filter(it => itemDef(it.id).zone === 'floor' && !itemDef(it.id).flat).sort((a, b) => b.y - a.y);
  const flat = room.items.filter(it => itemDef(it.id).flat);
  const wall = room.items.filter(it => itemDef(it.id).zone === 'wall');
  return [...floor, ...flat, ...wall].find(it => inRect(q, boxOf(it))) || null;
}
// ひきだしの アイコン
function itemIcon(c, id, x, y, size) {
  const d = ITEMS[id];
  const k = size / Math.max(d.w, d.h);
  c.save(); c.translate(x, y + (d.zone === 'wall' || d.flat ? 0 : d.h * k / 2)); c.scale(k, k);
  drawItem(c, id, { t: G.T, color: d.colors?.[0] });
  c.restore();
}

HOME.home = (arg) => {
  const party = arg === 'party';
  G.sound.startBgm('home');
  G.day.clock = 16;
  const save = G.save, room = save.room;
  const s = {
    phase: 'arrive', tab: 'shop', page: 0, drag: null, sel: null, msg: null, msgT: 0,
    punyu: { x: 640, y: 590 }, night: 0, sleepT: 0,
    // あそびに くる ともだち（きんようびは みんな）
    guests: (party ? CLASSMATES : [G.day.friend]).map((sp, i, a) => ({ sp, x: 1120 + i * 90, y: 520 + (i % 2) * 70, tx: a.length > 1 ? 330 + i * 110 : 760, show: false })),
  };
  const r0 = G.day.results, first = G.save.days === 0;
  talk([
    { who: 'punyu', text: 'ただいま〜！' },
    r0.draw || r0.craft ? { who: 'punyu', text: `あっ！ きょう ${r0.draw ? 'かいた え' : ''}${r0.draw && r0.craft ? ' と ' : ''}${r0.craft ? 'つくった もの' : ''}が かざってある！` } : null,
    party ? { who: 'punyu', text: 'みんなが くる まえに へやを かざろう！' } : null,
    first ? { text: `がっこうで シールを もらったね。 シールで かぐを かって、 へやを かざろう！` } : { text: `シールは ${G.save.stickers}まい。 かぐを かって かざろう！` },
    first ? { text: 'かぐは ゆびで うごかせるよ。 タッチすると いろが かわる ものも あるよ' } : null,
  ], () => { s.phase = 'decor'; });
  const rectOf = () => {
    if (s.phase === 'decor') { const w = Math.min(V.W, (V.H - DRAWER_H) * 1.6); return { x: (V.W - w) / 2, y: 0, w, h: w / 1.6 }; }
    const w = Math.min(V.W, V.H * 1.6); return { x: (V.W - w) / 2, y: (V.H - w / 1.6) / 2, w, h: w / 1.6 };
  };
  const toRoom = p => { const r = rectOf(), k = r.w / ROOM.w; return { x: (p.x - r.x) / k, y: (p.y - r.y) / k }; };
  const say = m => { s.msg = m; s.msgT = 2.2; };
  const startVisit = () => {
    s.phase = 'visit'; s.sel = null; G.persist();
    G.sound.play('bell');
    talk([{ text: 'ピンポーン♪' }, party ? { text: 'みんな「おじゃましまーす！」' } : { who: s.guests[0].sp, text: 'ぷにゅ〜！ あそびに きたよ！' }], () => { for (const g of s.guests) { g.show = true; g.walk = true; } });
  };
  const afterArrive = () => {
    const lines = [];
    let loves = false;
    if (party) {
      // みんな ひとことずつ
      for (const g of s.guests) { const cm = friendComments(room, g.sp); loves ||= friendLoves(room, g.sp); lines.push({ who: g.sp, text: (cm.find(x => x.kind === 'like') || cm[0]).text }); }
      lines.push({ who: 'kirara', text: 'はっぴょうかい、 だいせいこう！ かんぱーい！' }, { text: 'みんな「かんぱーい！」' });
      lines.push({ who: 'chapu', text: 'ぷにゅ、 いっしょに れんしゅう してくれて ありがとう' }, { who: 'punyu', text: 'みんなと おなじ クラスで よかった！' });
      lines.push({ text: 'みんなで おどったり わらったり… たのしい よるに なりました' }, { text: 'みんな「ばいばーい！ また らいしゅう！」' });
    } else {
      const f = s.guests[0].sp, cm = friendComments(room, f);
      loves = friendLoves(room, f);
      lines.push(...cm.slice(0, 3).map(x => ({ who: f, text: x.text })));
      lines.push({ who: 'punyu', text: 'えへへ ありがとう！' });
      lines.push({ who: f, text: loves ? 'また あそびに きても いい？ この へや だいすき！' : 'たのしかった！ また あそぼうね！' });
      lines.push({ who: f, text: 'じゃあ また あした がっこうでね！ ばいばーい！' });
    }
    for (const g of s.guests) burst(...guestScreen(g), 'heart', loves ? 10 : 5);
    G.sound.play(loves || party ? 'fanfare' : 'yay');
    talk(lines, () => { for (const g of s.guests) g.leave = true; });
  };
  const guestScreen = g => { const r = rectOf(), k = r.w / ROOM.w; return [r.x + g.x * k, r.y + (g.y - 100) * k]; };
  return {
    down(p) {
      if (s.phase !== 'decor' || talking()) return;
      const r = rectOf();
      if (!inRect(p, r) || p.y > V.H - DRAWER_H) return;
      const q = toRoom(p);
      const it = pickItem(room, q);
      if (!it) { s.sel = null; return; }
      s.drag = { it, ox: q.x - it.x, oy: q.y - it.y, sx: p.x, sy: p.y, moved: false, x0: it.x, y0: it.y };
      s.sel = it; G.sound.play('pick');
      // つかんだ ものを いちばん うえに
      room.items.splice(room.items.indexOf(it), 1); room.items.push(it);
    },
    move(p) {
      if (!s.drag) return;
      if (Math.hypot(p.x - s.drag.sx, p.y - s.drag.sy) > 8) s.drag.moved = true;
      const q = toRoom(p);
      s.drag.it.x = q.x - s.drag.ox; s.drag.it.y = q.y - s.drag.oy;
      s.drag.over = p.y > V.H - DRAWER_H;
      if (!s.drag.over) clampItem(s.drag.it);
    },
    up() {
      if (!s.drag) return;
      const { it, moved, over } = s.drag;
      if (!moved) { if (recolor(it)) { G.sound.play('pop'); burst(...(() => { const r = rectOf(), k = r.w / ROOM.w, b = boxOf(it); return [r.x + (b.x + b.w / 2) * k, r.y + (b.y + b.h / 2) * k]; })(), 'star', 5); } }
      else if (over) {
        if (it.id === 'mypic' || it.id === 'mycraft' || it.id === 'bed' || it.id === 'window' || it.id === 'rug') {
          it.x = s.drag.x0; it.y = s.drag.y0; clampItem(it);
          say(it.id === 'bed' ? 'ベッドは ねる ところ だから しまえないよ' : 'これは しまわないで おこう');
          G.sound.play('no');
        } else { putAway(save, it); s.sel = null; G.sound.play('whoosh'); }
      } else { clampItem(it); G.sound.play('drop'); }
      s.drag = null; G.persist();
    },
    draw(c, dt) {
      const W = V.W, H = V.H, r = rectOf(), k = r.w / ROOM.w;
      c.fillStyle = '#fbe3ec'; c.fillRect(0, 0, W, H);
      // ともだち と ぷにゅ の うごき
      if (s.guests[0].walk && !talking()) {
        for (const g of s.guests) g.x = lerp(g.x, g.tx, 1 - Math.pow(0.02, dt));
        if (s.guests.every(g => Math.abs(g.x - g.tx) < 6)) { for (const g of s.guests) g.walk = false; afterArrive(); }
      }
      if (s.guests[0].leave && !talking()) {
        for (const g of s.guests) g.x += 520 * dt;
        if (s.guests.every(g => g.x > 1150)) {
          for (const g of s.guests) { g.leave = false; g.show = false; }
          s.phase = 'evening';
          talk(party ? [{ who: 'punyu', text: 'さいこうの 1しゅうかん だったな〜' }, { who: 'punyu', text: 'にっきを かいて ねよう' }]
            : [{ who: 'punyu', text: 'きょうは いっぱい あそんだな〜' }, { who: 'punyu', text: 'あしたも がっこう たのしみ！ そろそろ ねよう' }]);
        }
      }
      if (s.phase === 'sleep') {
        s.sleepT += dt; s.night = Math.min(1, s.sleepT / 1.6);
        const bed = room.items.find(it => it.id === 'bed');
        if (bed) { s.punyu.x = lerp(s.punyu.x, bed.x, 1 - Math.pow(0.01, dt)); s.punyu.y = lerp(s.punyu.y, bed.y - 15, 1 - Math.pow(0.01, dt)); }
        if (s.sleepT > 3.2 && !s.ended) { s.ended = true; G.next(); }
      }
      const hop = s.phase === 'visit' ? Math.abs(Math.sin(G.T * 5)) * 8 : 0;
      const gHop = g => g.walk || g.leave ? Math.abs(Math.sin(G.T * 10 + g.x)) * 10 : party && s.phase === 'visit' ? Math.max(0, Math.sin(G.T * 6 + g.tx)) * 14 : 0;
      const extras = [
        { y: s.punyu.y, draw: cc => drawPunyu(cc, s.punyu.x, s.punyu.y - hop, 62 * depth(s.punyu.y), { mood: s.phase === 'sleep' && s.sleepT > 1.4 ? 'sleep' : 'happy', blanket: s.phase === 'sleep' && s.sleepT > 1.4 }) },
      ];
      for (const g of s.guests) if (g.show) extras.push({ y: g.y, draw: cc => drawCreature(cc, g.sp, g.x, g.y - gHop(g), (party ? 48 : 58) * depth(g.y), { t: G.T + g.tx, mood: 'happy' }) });
      drawHomeRoom(c, room, r, { extras, glow: s.phase === 'decor' ? s.sel : null, lift: s.drag?.it, night: s.night });
      if (s.phase === 'sleep' && s.sleepT > 1.6) {
        for (let i = 0; i < 3; i++) { const a = (G.T * 0.6 + i / 3) % 1; c.globalAlpha = 1 - a; text(c, 'z', r.x + (s.punyu.x + 60) * k + a * 50, r.y + (s.punyu.y - 120) * k - a * 80, 28 + i * 6, { color: '#fff3b0' }); c.globalAlpha = 1; }
      }
      if (s.phase === 'decor') drawDrawer(c, s, save, r, say, startVisit);
      if (s.msg && s.msgT > 0) { s.msgT -= dt; drawSpeech(c, r.x + s.punyu.x * k, r.y + (s.punyu.y - 130) * k, s.msg, 22, { maxW: 380 }); }
      if (s.phase === 'evening' && !talking()) {
        button(c, { x: W / 2 - 140, y: H - 110, w: 280, h: 80 }, '🌙 ねる', () => { s.phase = 'sleep'; G.sound.play('night'); G.sound.startBgm('night'); }, { color: '#7f8fd9', ink: '#fff', shadow: '#5a68b0', size: 34, pulse: true });
      }
      hud(c, s.phase === 'sleep' ? 'よる' : 'ほうかご');
    },
  };
};

function drawDrawer(c, s, save, r, say, startVisit) {
  const W = V.W, H = V.H, y0 = H - DRAWER_H;
  c.fillStyle = s.drag?.over ? '#ffe1ea' : '#fff6f0'; c.fillRect(0, y0, W, DRAWER_H);
  c.fillStyle = '#ffc2d4'; c.fillRect(0, y0, W, 5);
  if (s.drag) { text(c, s.drag.over ? 'はなすと しまうよ' : 'ここに もってくると しまえるよ', W / 2, y0 + DRAWER_H / 2, 26, { color: '#c06a8a' }); return; }
  // タブ
  const tabs = [['shop', '🛒', 'おみせ'], ['wall', '🖼️', 'かべ'], ['floor', '🟫', 'ゆか']];
  tabs.forEach(([id, ic, nm], i) => {
    const x = 10, y = y0 + 10 + i * 45, on = s.tab === id;
    hitArea({ x, y, w: 120, h: 42 }, () => { s.tab = id; s.page = 0; G.sound.play('pick'); }, { instant: true });
    c.fillStyle = on ? '#ff7aa8' : '#fff'; rr(c, x, y, 120, 40, 14); c.fill();
    emoji(c, ic, x + 24, y + 20, 22); text(c, nm, x + 76, y + 21, 20, { color: on ? '#fff' : '#5a3d55' });
  });
  // できた
  button(c, { x: W - 160, y: y0 + 30, w: 146, h: 90 }, 'できた！', () => {
    talk([{ who: 'punyu', text: 'よし！ できた！' }], startVisit);
  }, { ...PINK, size: 30, pulse: true });
  // ならべる もの
  const x0 = 150, x1 = W - 180, cell = 112;
  const per = Math.max(1, Math.floor((x1 - x0 - 80) / cell));
  let entries = [];
  if (s.tab === 'shop') entries = SHOP.map(e => ({ kind: 'item', id: e.id, price: e.price, have: stored(save, e.id) }));
  else if (s.tab === 'wall') entries = FREE_WALLS.map(id => ({ kind: 'wall', id }));
  else entries = FREE_FLOORS.map(id => ({ kind: 'floor', id }));
  const pages = Math.ceil(entries.length / per);
  s.page = clamp(s.page, 0, pages - 1);
  const list = entries.slice(s.page * per, s.page * per + per);
  const startX = x0 + 40 + ((x1 - x0 - 80) - per * cell) / 2;
  if (pages > 1) {
    button(c, { x: x0, y: y0 + 45, w: 34, h: 60 }, '◀', () => { s.page = (s.page - 1 + pages) % pages; }, { size: 20, round: 12 });
    button(c, { x: x1 - 34, y: y0 + 45, w: 34, h: 60 }, '▶', () => { s.page = (s.page + 1) % pages; }, { size: 20, round: 12 });
  }
  list.forEach((e, i) => {
    const x = startX + i * cell, y = y0 + 14, w = cell - 10, h = DRAWER_H - 26;
    const on = (e.kind === 'wall' && save.room.wall === e.id) || (e.kind === 'floor' && save.room.floor === e.id);
    c.fillStyle = on ? '#fff3b0' : '#fff'; rr(c, x, y, w, h, 16); c.fill();
    c.strokeStyle = on ? '#ffd84a' : '#f3d6e0'; c.lineWidth = 3; rr(c, x, y, w, h, 16); c.stroke();
    if (e.kind === 'item') {
      itemIcon(c, e.id, x + w / 2, y + 46, 70);
      if (e.have > 0) { c.fillStyle = '#8fd36a'; rr(c, x + 10, y + h - 34, w - 20, 26, 13); c.fill(); text(c, 'だす', x + w / 2, y + h - 21, 18, { color: '#fff' }); }
      else {
        const can = save.stickers >= e.price;
        c.fillStyle = can ? '#ffd84a' : '#eee'; rr(c, x + 14, y + h - 34, w - 28, 26, 13); c.fill();
        stickerIcon(c, x + w / 2 - 16, y + h - 21, 10); text(c, `${e.price}`, x + w / 2 + 10, y + h - 20, 20, { color: can ? '#7a4a10' : '#aaa' });
      }
      hitArea({ label: 'shop:' + e.id, x, y, w, h }, () => {
        if (e.have > 0) { const it = takeOut(save, e.id, 300 + Math.random() * 400, 480 + Math.random() * 100); if (it) { s.sel = it; G.sound.play('drop'); } }
        else if (save.stickers >= e.price) {
          const it = buy(save, e.id, 300 + Math.random() * 400, 480 + Math.random() * 100);
          if (it) { s.sel = it; G.sound.play('sticker'); showBanner(`${ITEMS[e.id].name}！`, '', '#ff7aa8'); }
        } else { G.sound.play('no'); say('シールが たりないよ… また がっこうで もらおう'); }
        G.persist();
      });
    } else {
      // かべ・ゆかの みほん
      c.save(); c.beginPath(); rr(c, x + 8, y + 8, w - 16, h - 40, 10); c.clip();
      c.translate(x + 8, y + 8);
      const sc = (w - 16) / ROOM.w;
      if (e.kind === 'wall') { c.scale(sc * 2.2, sc * 2.2); drawWall(c, e.id); }
      else { c.scale(sc * 2.2, sc * 2.2); c.translate(0, -ROOM.floorTop); drawFloor(c, e.id); }
      c.restore();
      text(c, (e.kind === 'wall' ? WALLS : FLOORS)[e.id].name, x + w / 2, y + h - 18, e.id.length > 8 ? 13 : 15);
      hitArea({ x, y, w, h }, () => { save.room[e.kind] = e.id; G.sound.play('pop'); G.persist(); });
    }
  });
}
