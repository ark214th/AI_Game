// ぷにゅの がっこう：がめんの ながれ（1にちの よてい G.day.plan を G.next() で すすめる）
import { SAVE_KEY, normalize, newSave, tryBag, bagDone, bagChoices, dayNeeds, finishDay, diaryLines } from './core.mjs';
import { CLASSMATES, TEACHER, OUTFITS, nameOf } from './data.mjs';
import { DAYS, SUBJECTS, DAY_NAMES, DAY_SHORT, LUNCHES } from './story.mjs';
import { Sound } from './audio.mjs';
import {
  G, V, hits, initCanvas, beginFrame, endFrame, toV, inRect, button, hitArea, pointerDownHits, pointerUpHits, isPressing,
  talk, talking, talkTap, updateTalk, drawTalk, panel, hud, drawPunyu, drawCreature, text, emoji, rr, circ, ell, star,
  burst, floatText, updateFx, drawFx, showBanner, drawBanner, fadeTo, updateFade, drawFade, fade, resetTalk, ease, clamp, lerp, stickerIcon, drawSpeech, hash,
} from './ui.mjs';
import { classFloor, drawHomeRoom, drawClassroom, drawDesk, drawStreet, drawSchoolGate, drawPunyuHouse, drawSky, drawFramedPic, drawCraft } from './art.mjs';
import { ROOM } from '../fushigi-pet-hotel/data.mjs';
import { depth } from '../fushigi-pet-hotel/draw.mjs';
import { LESSONS } from './lessons.mjs';
import { HOME } from './home.mjs';

// ---------- ほぞん ----------
function load() { try { return normalize(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { return newSave(); } }
G.save = load();
G.persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch { /* いっぱい */ } };
G.sound = new Sound(G.save.sound);
const DEBUG = new URLSearchParams(location.search).has('debug');

// きょう いちにちの きろく
export function newDay(dayNo = 1) {
  return { dayNo, clock: 7, results: {}, awarded: {}, friend: DAYS[dayNo].recess[0].sp, packed: [], plan: buildPlan(dayNo), step: -1 };
}
// 1にちの よてい
function buildPlan(d) {
  const D = DAYS[d], P = [];
  P.push({ scene: 'morning' }, { scene: 'walk', arg: 'school' }, { scene: 'classHello' });
  const per = (i, clock) => {
    const p = D.periods[i]; if (!p) return;
    const sub = SUBJECTS[p.id];
    P.push({ scene: p.id, arg: p.arg, period: { label: p.id === 'recital' ? 'ごご' : `${i + 1}じかんめ`, name: sub.name, icon: sub.icon, clock } });
  };
  per(0, 9);
  P.push({ scene: 'recess', period: { label: 'やすみじかん', name: 'あそぼう！', icon: '🏃', clock: 10 } });
  per(1, 10.75);
  P.push({ scene: 'lunch', period: { label: 'おひる', name: 'きゅうしょく', icon: '🍛', clock: 12 } });
  per(2, 13);
  P.push({ scene: 'classBye' }, { scene: 'walk', arg: 'home' }, { scene: 'home', arg: D.party ? 'party' : undefined }, { scene: 'diary' });
  return P;
}
G.day = newDay(1);
G.next = () => {
  if (fade.dir) return;   // きりかえの とちゅうは 2かいめを むしする（つづけて タッチ しても とばない）
  if (G.dbgNext) console.log('next', G.day.step + 1, G.day.plan[G.day.step + 1]?.scene, new Error().stack.split('\n')[2]);
  const st = G.day.plan[++G.day.step];
  if (!st) return G.go('title');
  if (st.period) G.go('period', { ...st.period, next: st.scene, arg: st.arg });
  else G.go(st.scene, st.arg);
};
// つぎの じゅぎょうの なまえ（「つぎは ○○ です」に つかう）
G.upcoming = () => { const st = G.day.plan[G.day.step + 1]; return st?.period ? st.period.name : null; };
G.upcomingLine = () => { const n = G.upcoming(); return n ? { who: TEACHER, text: `つぎは ${n} です！` } : null; };
G.startDay = d => { G.day = newDay(d); G.next(); };
// シールを あげる（もういちど あそんでも ふえすぎない）
G.award = (key, n) => {
  const had = G.day.awarded[key] || 0;
  if (n <= had) return 0;
  G.day.awarded[key] = n; G.save.stickers += n - had; G.persist();
  G.sound.play('sticker');
  return n - had;
};

// ---------- がめんの きりかえ ----------
const SCENES = {};
let scene = null, sceneName = '';
G.go = (name, arg) => fadeTo(() => start(name, arg));
function start(name, arg) {
  sceneName = name;
  resetTalk();
  scene = SCENES[name](arg);
  scene.t = 0;
  G.talkAt = scene.talkAt || 'top';
  if (DEBUG) console.log('scene', name);
}
G.start = start;

// ---------- タイトル ----------
SCENES.title = () => {
  G.sound.startBgm('home');
  return {
    draw(c, dt) {
      const W = V.W, H = V.H, gy = H * 0.7;
      drawStreet(c, G.T * 20, { t: G.T, end: (cc, x, y) => drawSchoolGate(cc, W / 2 - 210, y), endX: 0 });
      // みんな
      const kids = ['fuwari', 'gorota', 'pokari', 'punyu', 'chapu', 'popuri', 'kirara'];
      kids.forEach((sp, i) => {
        const x = W / 2 + (i - 3) * Math.min(110, W / 8), hop = Math.max(0, Math.sin(G.T * 4 + i * 0.9)) * 16;
        const r = sp === 'punyu' ? 46 : 36;
        if (sp === 'punyu') drawPunyu(c, x, gy + 70 - hop, r, { mood: 'happy', sq: hop < 2 ? 0.06 : -0.04 });
        else drawCreature(c, sp, x, gy + 60 - hop, r, { t: G.T, mood: 'happy' });
      });
      // タイトル
      c.save(); c.translate(W / 2, 130 + Math.sin(G.T * 1.6) * 4);
      text(c, 'ぷにゅの がっこう', 0, 0, 84, { color: '#ff5d86', stroke: '#fff', sw: 18 });
      c.restore();
      const wk = G.save.week, go = d => { G.sound.unlock(); G.sound.play('yay'); G.startDay(d); };
      const PINKB = { color: '#ff7aa8', ink: '#fff', shadow: '#d9507e' };
      if (!G.save.days) button(c, { x: W / 2 - 150, y: 250, w: 300, h: 84 }, 'はじめる', () => go(1), { ...PINKB, size: 38, pulse: true });
      else if (!wk.cleared) {
        button(c, { x: W / 2 - 190, y: 236, w: 380, h: 84 }, `つづきから（${DAY_NAMES[wk.day]}）`, () => go(wk.day), { ...PINKB, size: 32, pulse: true });
        if (wk.day > 1) button(c, { x: W / 2 - 110, y: 336, w: 220, h: 50 }, 'げつようびから', () => go(1), { size: 22 });
      } else {
        text(c, 'どの ひを あそぶ？', W / 2, 238, 30, { color: '#ff5d86', stroke: '#fff', sw: 8 });
        for (let d = 1; d <= 5; d++) {
          const bw = 110, x = W / 2 + (d - 3) * (bw + 14) - bw / 2;
          button(c, { x, y: 266, w: bw, h: 74 }, DAY_SHORT[d], () => go(d), d === 5 ? { color: '#ffd84a', ink: '#7a4a10', shadow: '#d9a520', size: 32 } : { ...PINKB, size: 32 });
        }
        text(c, d5Label(), W / 2, 370, 20, { color: '#7a4a6a', stroke: '#fff', sw: 6 });
      }
      hud(c, '', { stickers: false });
    },
  };
};

const d5Label = () => 'きんようびは ダンス はっぴょうかい！';

// ---------- あさ（ぷにゅの へや） ----------
SCENES.morning = () => {
  G.sound.startBgm('home');
  G.day.clock = 7;
  const s = { phase: 'sleep', taps: 0, wake: 0, py: 560, px: 190, outfitPick: G.save.outfit, items: [], bagShake: 0, bagT: 0, flying: [], hop: 0 };
  // ランドセルの まわりに ものを ちらす
  const spots = [[-300, -40], [-160, 60], [220, -60], [330, 50], [-330, 110], [180, 120]];
  const D = DAYS[G.day.dayNo];
  s.needs = dayNeeds(G.day.dayNo);
  s.items = bagChoices(G.day.dayNo, G.save.week.weeks).map((it, i) => ({ ...it, dx: spots[i][0], dy: spots[i][1], shake: 0, inBag: false }));
  talk(G.day.dayNo === 1 ? D.morning : [`${DAY_NAMES[G.day.dayNo]}の あさ。 ぷにゅを トントンして おこそう`]);
  const roomRect = () => { const w = Math.min(V.W, V.H * 1.6); return { x: (V.W - w) / 2, y: (V.H - w / 1.6) / 2, w, h: w / 1.6 }; };
  const toRoom = (r, p) => ({ x: (p.x - r.x) / (r.w / ROOM.w), y: (p.y - r.y) / (r.w / ROOM.w) });
  return {
    draw(c, dt) {
      const r = roomRect(), k = r.w / ROOM.w;
      c.fillStyle = '#ffd6e4'; c.fillRect(0, 0, V.W, V.H);
      if (s.phase !== 'sleep') s.hop += dt;
      const sleeping = s.phase === 'sleep';
      const extras = [{
        y: 999, draw: cc => {
          if (sleeping) {
            drawPunyu(cc, 190, 545, 52, { mood: 'sleep', blanket: true, acc: null, sq: Math.sin(G.T * 2) * 0.03 });
            for (let i = 0; i < 3; i++) { const a = (G.T * 0.6 + i / 3) % 1; cc.globalAlpha = 1 - a; text(cc, 'z', 250 + a * 60 + i * 6, 440 - a * 90, 30 + i * 6, { color: '#7f8fd9' }); cc.globalAlpha = 1; }
          } else if (s.phase !== 'bag' && s.phase !== 'go') {
            const hop = Math.max(0, Math.sin(s.hop * 6)) * 14 * Math.max(0, 1 - s.hop / 1.5);
            drawPunyu(cc, s.px, s.py - hop, 62 * depth(s.py), { mood: 'happy' });
          }
        },
      }];
      drawHomeRoom(c, G.save.room, r, { extras });
      if (sleeping) {
        const bx = r.x + 190 * k, by = r.y + 500 * k;
        hitArea({ label: 'bed', x: bx - 120 * k, y: by - 110 * k, w: 240 * k, h: 180 * k }, () => {
          if (talking()) return;
          s.taps++; G.sound.play('pop'); burst(bx, by - 40 * k, 'star', 4);
          if (s.taps >= 3) {
            s.phase = 'wake'; s.hop = 0; s.px = 330; s.py = 560; G.sound.play('morning');
            talk(G.day.dayNo === 1 ? [{ who: 'punyu', text: 'ふわぁ… おはよう！' }, { who: 'punyu', text: 'あっ きょうは がっこう だ！ きがえなくちゃ' }] : [...D.morning, { who: 'punyu', text: 'きがえ なくちゃ！' }], () => { s.phase = 'dress'; });
          }
        }, { instant: true });
        if (!talking()) text(c, `トントン ${s.taps} / 3`, bx, by - 150 * k, 30, { color: '#ff5d86', stroke: '#fff', sw: 8 });
      }
      if (s.phase === 'dress') drawDress(c, s);
      if (s.phase === 'bag' || s.phase === 'go') drawBag(c, s, dt);
      hud(c, 'あさ');
    },
  };
};
function drawDress(c, s) {
  const W = V.W, H = V.H;
  c.fillStyle = 'rgba(255,240,246,.82)'; c.fillRect(0, 0, W, H);
  const lx = W * 0.27;
  c.fillStyle = '#fff'; circ(c, lx, H * 0.5, 150); c.fill();
  drawPunyu(c, lx, H * 0.5 + 110, 110, { mood: 'happy', acc: s.outfitPick, sq: Math.sin(G.T * 3) * 0.02 });
  text(c, 'きょうは どれに する？', W * 0.66, 92, 38, { color: '#ff5d86', stroke: '#fff', sw: 8 });
  const cols = 3, bw = 150, bh = 108, gx = W * 0.66 - (cols * bw + (cols - 1) * 16) / 2;
  OUTFITS.forEach((o, i) => {
    const x = gx + (i % cols) * (bw + 16), y = 130 + Math.floor(i / cols) * (bh + 14);
    const on = s.outfitPick === o.id;
    button(c, { x, y, w: bw, h: bh }, '', () => { s.outfitPick = o.id; G.sound.play('pick'); burst(lx, H * 0.5 - 60, 'star', 5); }, { color: on ? '#fff3b0' : '#fff', shadow: on ? '#e8c84a' : '#e4c9d4', round: 22 });
    drawCreature(c, 'punyu', x + bw / 2, y + bh - 30, 30, { t: 0, mood: 'happy', acc: o.id });
    text(c, o.name, x + bw / 2, y + bh - 14, 18);
  });
  button(c, { x: W * 0.66 - 140, y: H - 110, w: 280, h: 76 }, 'これに する！', () => {
    G.save.outfit = s.outfitPick; G.persist(); G.sound.play('yay');
    burst(lx, H * 0.4, 'star', 12);
    s.phase = 'bag';
    talk([{ who: 'punyu', text: 'つぎは ランドセルの じゅんび！' }, { text: 'じかんわりを みて、 きょう つかう ものを ランドセルに いれよう' }]);
  }, { color: '#ff7aa8', ink: '#fff', shadow: '#d9507e', size: 34, pulse: true });
}
function drawBag(c, s, dt) {
  const W = V.W, H = V.H, cx = W / 2 + 60, cy = H * 0.56;
  c.fillStyle = 'rgba(255,240,246,.85)'; c.fillRect(0, 0, W, H);
  // じかんわり
  const tx = 18, ty = 74;
  panel(c, tx, ty, 220, 290, { fill: '#fffef4', stroke: '#9fd3ff' });
  text(c, 'じかんわり', tx + 110, ty + 34, 28, { color: '#3d7ac2' });
  text(c, DAY_NAMES[G.day.dayNo], tx + 110, ty + 62, 18, { color: '#7a9cc2' });
  DAYS[G.day.dayNo].periods.forEach((p, i) => {
    const y = ty + 106 + i * 62;
    c.fillStyle = '#eaf6ff'; rr(c, tx + 14, y - 26, 192, 54, 14); c.fill();
    if (!p) { text(c, `${i + 1}`, tx + 36, y, 26, { color: '#3d7ac2' }); text(c, '−', tx + 130, y, 24, { color: '#aab' }); return; }
    const sc = SUBJECTS[p.id];
    text(c, p.id === 'recital' ? 'ご' : `${i + 1}`, tx + 36, y, 26, { color: '#3d7ac2' });
    emoji(c, sc.icon, tx + 78, y, 30);
    text(c, sc.name, tx + 146, y, sc.name.length > 5 ? 18 : 22);
    if (s.items.find(it => it.id === (p.id === 'recital' ? 'costumebag' : sc.item))?.inBag) { c.strokeStyle = '#ff5d86'; c.lineWidth = 5; circ(c, tx + 36, y, 20); c.stroke(); }
  });
  // ランドセル
  s.bagShake = Math.max(0, s.bagShake - dt * 3);
  c.save(); c.translate(cx, cy + 70); c.rotate(Math.sin(G.T * 30) * 0.05 * s.bagShake);
  c.fillStyle = '#e8506e'; rr(c, -90, -110, 180, 170, 34); c.fill();
  c.fillStyle = '#ff6f91'; rr(c, -90, -110, 180, 90, 34); c.fill();
  c.fillStyle = '#ffd84a'; rr(c, -16, -40, 32, 22, 6); c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, -70, -100, 50, 12, 6); c.fill();
  c.restore();
  const packed = s.items.filter(it => it.inBag).length;
  text(c, `${packed} / ${s.needs.length}`, cx, cy + 165, 30, { color: '#ff5d86', stroke: '#fff', sw: 7 });
  // もの
  for (const it of s.items) {
    if (it.inBag) continue;
    it.shake = Math.max(0, it.shake - dt * 2.5);
    const x = cx + it.dx + Math.sin(G.T * 40) * 8 * it.shake, y = cy + it.dy;
    c.fillStyle = '#fff'; circ(c, x, y, 52); c.fill(); c.strokeStyle = '#ffd1df'; c.lineWidth = 4; c.stroke();
    emoji(c, it.icon, x, y - 6, 54);
    text(c, it.name, x, y + 40, 17);
    hitArea({ label: 'bag:' + it.id, x: x - 56, y: y - 56, w: 112, h: 112 }, () => {
      if (talking()) return;
      const res = tryBag(G.day.packed, it.id, s.needs);
      if (res === 'ok') {
        it.inBag = true; s.bagShake = 1; G.sound.play('drop'); burst(cx, cy, 'star', 8);
        floatText(cx, cy - 60, `${it.name} OK！`);
        if (bagDone(G.day.packed, s.needs)) {
          G.sound.play('fanfare'); showBanner('じゅんび できた！');
          s.phase = 'go';
        }
      } else { it.shake = 1; G.sound.play('no'); talk([{ who: 'punyu', text: it.say || `${it.name}は きょうは つかわないよ`, mood: 'normal' }]); }
    }, { instant: true });
  }
  if (s.phase === 'go') {
    button(c, { x: cx - 160, y: H - 100, w: 320, h: 80 }, 'いってきます！', () => { G.sound.play('door'); G.next(); }, { color: '#ff7aa8', ink: '#fff', shadow: '#d9507e', size: 36, pulse: true });
  }
}

// ---------- みち ----------
SCENES.walk = (to) => {
  const toSchool = to === 'school';
  G.sound.startBgm('home');
  const D = toSchool ? 1700 : 1500;
  const friend = toSchool ? DAYS[G.day.dayNo].walkWith : G.day.friend;
  const s = { scroll: 0, hold: false, joined: !toSchool, metAt: toSchool ? 500 : 99999, splitAt: toSchool ? 99999 : 900, split: false, done: false, step: 0 };
  if (!toSchool) talk([{ who: friend, text: 'いっしょに かえろう！' }]);
  return {
    down() { s.hold = true; },
    up() { s.hold = false; },
    draw(c, dt) {
      const W = V.W, H = V.H, gy = H * 0.66;
      if (!talking() && !s.done) {
        const sp = s.hold ? 430 : 230;
        s.scroll = Math.min(D, s.scroll + sp * dt); s.step += dt * (s.hold ? 11 : 7);
        if (!s.joined && s.scroll >= s.metAt) { s.joined = true; talk(DAYS[G.day.dayNo].walk); }
        if (!toSchool && !s.split && s.scroll >= s.splitAt) { s.split = true; talk(DAYS[G.day.dayNo].party ? [{ who: friend, text: 'あとで みんなで いくからね！' }, { who: 'punyu', text: 'うん！ じゅんび して まってる！' }] : [{ who: friend, text: 'じゃあ あとで ぷにゅの おうちに いくね！' }, { who: 'punyu', text: 'うん！ まってるね！' }]); }
        if (s.scroll >= D) {
          s.done = true;
          talk([toSchool ? { who: 'punyu', text: 'がっこうに ついた〜！' } : { who: 'punyu', text: 'ただいま〜！' }], () => G.next());
        }
      }
      const gateWorld = D + W * 0.55;
      drawStreet(c, s.scroll, {
        evening: toSchool ? 0 : 1, t: G.T, endX: gateWorld - s.scroll,
        end: (cc, x, y) => toSchool ? drawSchoolGate(cc, x, y) : drawPunyuHouse(cc, x - 40, y, 1),
      });
      const px = W * 0.38, py = gy + 70;
      const hop = Math.abs(Math.sin(s.step)) * 14 * (talking() || s.done ? 0 : 1);
      if (s.joined && !(s.split && !toSchool)) drawCreature(c, friend, px - 110, py - Math.abs(Math.sin(s.step + 1)) * 12 * (talking() ? 0 : 1), 40, { t: G.T, mood: 'happy' });
      if (!toSchool && s.split) { const fx = px - 110 - (s.scroll - s.splitAt) * 1.2; if (fx > -60) drawCreature(c, friend, fx, py, 40, { t: G.T, mood: 'happy' }); }
      // ランドセル
      c.fillStyle = '#e8506e'; rr(c, px - 70, py - 92 - hop, 34, 44, 10); c.fill();
      drawPunyu(c, px, py - hop, 48, { mood: 'happy', sq: hop < 2 ? 0.05 : -0.03 });
      if (!talking() && !s.done && s.scroll < 300) text(c, 'がめんを おしていると はやく あるくよ', W / 2, H - 30, 24, { stroke: '#fff', sw: 7 });
      hud(c, toSchool ? 'がっこうへ' : 'かえりみち');
    },
  };
};

// ---------- きょうしつ ----------
// せき（よこは がめんの わりあい、たては ゆかから）
export const SEATS = { fuwari: [0.36, 0], gorota: [0.54, 0], pokari: [0.72, 0], chapu: [0.9, 0], popuri: [0.45, 1], punyu: [0.63, 1], kirara: [0.81, 1] };
export function drawClassKids(c, { mood = {}, look = 0, eat = false, bubble = null } = {}) {
  const W = V.W, H = V.H, fy = classFloor();
  const rows = [[], []];
  for (const [sp, [fx, row]] of Object.entries(SEATS)) rows[row].push([sp, fx]);
  rows.forEach((list, row) => {
    for (const [sp, fx] of list) {
      const x = W * fx, y = fy + 62 + row * 92, r = row ? 44 : 36;
      const m = mood[sp] || 'normal';
      const st = { t: G.T + fx * 3, mood: eat ? 'eat' : m, mouth: eat ? Math.max(0, Math.sin(G.T * 8 + fx * 9)) : 0, look };
      if (sp === 'punyu') drawPunyu(c, x, y, r, st); else drawCreature(c, sp, x, y, r, st);
      drawDesk(c, x, y - r * 0.35, row ? 1.05 : 0.9);
    }
  });
  if (bubble) { const [fx, row] = SEATS[bubble.sp]; drawSpeech(c, W * fx, fy + 62 + row * 92 - (row ? 100 : 82), bubble.text, 22, { maxW: 300 }); }
}
export function drawTeacher(c, mood = 'happy') {
  const W = V.W, H = V.H, fy = classFloor();
  drawCreature(c, TEACHER, W * 0.15, fy + 70, 58, { t: G.T, mood });
}

SCENES.classHello = () => {
  G.sound.startBgm('school');
  G.day.clock = 8.5;
  const D = DAYS[G.day.dayNo];
  talk([...D.hello, G.upcomingLine()], () => G.next());
  return {
    talkAt: 'bottom',
    draw(c, dt) {
      drawClassroom(c, D.board, { t: G.T });
      drawTeacher(c);
      drawClassKids(c, { mood: { punyu: 'happy', kirara: 'happy', gorota: 'happy', fuwari: 'happy', popuri: 'happy' } });
      hud(c, `${DAY_NAMES[G.day.dayNo]}  あさの かい`);
    },
  };
};

SCENES.classBye = () => {
  G.sound.startBgm('school');
  G.day.clock = 14.5;
  const D = DAYS[G.day.dayNo], f = G.day.friend;
  talk([
    ...D.bye,
    { who: TEACHER, text: 'それでは みなさん、 さようなら！' },
    { text: 'みんな「さようなら〜！」' },
    D.party ? null : { who: f, text: 'ぷにゅ、 あとで おうちに あそびに いっても いい？' },
    D.party ? null : { who: 'punyu', text: 'もちろん！ へやを かざって まってるね！' },
  ], () => G.next());
  return {
    talkAt: 'bottom',
    draw(c) {
      drawClassroom(c, D.byeBoard || 'また あした', { t: G.T, evening: 1 });
      drawTeacher(c);
      drawClassKids(c, { mood: { punyu: 'happy', [f]: 'happy' } });
      c.fillStyle = 'rgba(255,170,90,.12)'; c.fillRect(0, 0, V.W, V.H);
      hud(c, 'かえりの かい');
    },
  };
};

// ---------- チャイム（じかんの きりかえ） ----------
SCENES.period = (a) => {
  G.sound.play('chime');
  G.day.clock = a.clock ?? G.day.clock;
  let t = 0;
  const next = () => { if (t < 0.5) return; t = -99; G.go(a.next, a.arg); };
  return {
    down: next,
    draw(c, dt) {
      t += dt;
      if (t > 4.2) next();
      const W = V.W, H = V.H;
      c.fillStyle = '#fff4f8'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { c.fillStyle = ['#ffd6e4', '#d6ecff', '#fff1b8'][i % 3]; circ(c, hash(i) * W, (hash(i + 5) * H + G.T * 20 * (1 + hash(i + 2))) % (H + 60) - 30, 20 + hash(i + 9) * 30); c.fill(); }
      const k = ease(Math.min(1, Math.max(0, t) / 0.5));
      c.save(); c.translate(W / 2, H / 2); c.scale(0.7 + k * 0.3, 0.7 + k * 0.3); c.globalAlpha = k;
      c.save(); c.rotate(Math.sin(G.T * 10) * 0.2 * Math.max(0, 1 - t / 2.5)); emoji(c, '🔔', 0, -150, 80); c.restore();
      text(c, 'キーン コーン カーン コーン♪', 0, -70, 32, { color: '#a07ad0' });
      text(c, a.label, 0, 0, 44, { color: '#5a3d55' });
      emoji(c, a.icon, -150, 80, 70);
      text(c, a.name, 30, 80, 72, { color: '#ff5d86', stroke: '#fff', sw: 12 });
      c.restore();
      if (t > 1) text(c, 'タッチで すすむ', W / 2, H - 40, 22, { color: '#b08aa8' });
    },
  };
};

// ---------- きゅうしょく ----------
SCENES.lunch = () => {
  G.sound.startBgm('school');
  G.day.clock = 12.2;
  const LD = LUNCHES[DAYS[G.day.dayNo].lunch];
  const LUNCH = LD.foods.map(([id, name, icon, bites]) => ({ id, name, icon, bites })), LUNCH_TALK = LD.talk;
  const s = { phase: 'ready', left: LUNCH.map(f => f.bites), eatT: 0, bubble: null, bubbleT: 0, said: new Set() };
  talk([
    { who: TEACHER, text: 'おまちかねの きゅうしょくの じかん です！' },
    { who: 'pokari', text: `きょうは ${LUNCH[0].name} だって！` },
    { who: TEACHER, text: 'みんなで 「いただきます」 しましょう' },
  ]);
  return {
    draw(c, dt) {
      const W = V.W, H = V.H;
      drawClassroom(c, LD.board, { t: G.T });
      s.eatT = Math.max(0, s.eatT - dt);
      if (s.bubbleT > 0) { s.bubbleT -= dt; if (s.bubbleT <= 0) s.bubble = null; }
      drawClassKids(c, { eat: s.phase === 'eat', bubble: s.bubble });
      drawTeacher(c);
      // ぷにゅ と トレー
      c.fillStyle = 'rgba(255,248,240,.0)';
      const tw = Math.min(560, W - 240), tx = W / 2 - tw / 2 + 90, ty = H - 200;
      const px = tx - 110, py = H - 20;
      drawPunyu(c, px, py, 74, { mood: s.eatT > 0 ? 'eat' : 'happy', mouth: s.eatT > 0 ? Math.abs(Math.sin(s.eatT * 18)) : 0 });
      c.fillStyle = 'rgba(0,0,0,.12)'; rr(c, tx, ty + 8, tw, 180, 28); c.fill();
      c.fillStyle = '#a7d8f0'; rr(c, tx, ty, tw, 180, 28); c.fill();
      c.fillStyle = '#c4e6f7'; rr(c, tx + 12, ty + 12, tw - 24, 156, 20); c.fill();
      const n = LUNCH.length, cw = (tw - 24) / n;
      LUNCH.forEach((f, i) => {
        const x = tx + 12 + cw * (i + 0.5), y = ty + 84, left = s.left[i];
        c.fillStyle = '#fff'; ell(c, x, y + 26, cw * 0.42, 22); c.fill();
        if (left > 0) {
          const k = 0.45 + 0.55 * left / f.bites;
          emoji(c, f.icon, x, y, 76 * k);
          if (s.phase === 'eat') hitArea({ label: 'food', x: x - cw / 2, y: ty, w: cw, h: 180 }, () => {
            if (talking()) return;
            s.left[i]--; s.eatT = 0.5;
            G.sound.play(f.id === 'milk' ? 'gulp' : 'munch');
            burst(x, y, 'star', 3);
            if (s.left[i] === 0) floatText(x, y - 40, 'ぜんぶ たべた！', '#ff7a3a', 26);
            // ときどき みんなが はなす
            if (Math.random() < 0.5 || !s.bubble) {
              const cands = CLASSMATES.filter(sp => !s.said.has(sp));
              if (cands.length) { const sp = cands[Math.floor(Math.random() * cands.length)]; s.said.add(sp); s.bubble = { sp, text: LUNCH_TALK[sp] }; s.bubbleT = 2.4; }
            }
            if (s.left.every(v => v <= 0)) {
              s.phase = 'done'; G.sound.play('fanfare'); showBanner('ごちそうさま でした！');
              G.day.results.lunch = true;
              const got = G.award('lunch', 1);
              setTimeout(() => talk([
                { who: 'punyu', text: 'おなか いっぱい！ おいしかった〜' },
                got ? { text: 'ぜんぶ たべたので シールを 1まい もらったよ！' } : null,
                ...(DAYS[G.day.dayNo].lunchEnd || []),
                G.upcomingLine(),
              ], () => G.next()), 1300);
              if (DAYS[G.day.dayNo].lunchEnd) setTimeout(() => { G.sound.play('fanfare'); burst(V.W * 0.81, V.H * 0.6, 'heart', 16); }, 2200);
            }
          }, { instant: true });
        } else { c.fillStyle = '#f2e6d8'; ell(c, x, y + 20, cw * 0.3, 12); c.fill(); }
      });
      if (s.phase === 'ready' && !talking()) {
        button(c, { x: W / 2 - 170, y: H * 0.36, w: 340, h: 90 }, 'いただきます！', () => {
          s.phase = 'eat'; G.sound.play('yay'); floatText(W / 2, H * 0.3, 'いただきまーす！', '#ff5d86', 40);
        }, { color: '#ffb347', ink: '#fff', shadow: '#d98a20', size: 40, pulse: true });
      }
      if (s.phase === 'eat' && !talking() && s.left.every((v, i) => v === LUNCH[i].bites)) text(c, 'たべものを タッチして たべよう', tx + tw / 2, ty - 24, 26, { stroke: '#fff', sw: 7 });
      hud(c, 'きゅうしょく');
    },
  };
};

// ---------- にっき（1にちの おわり） ----------
function nightSky(c) {
  const W = V.W, H = V.H;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3d4687'); g.addColorStop(1, '#8a7fd0');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { c.fillStyle = '#fff7c8'; c.globalAlpha = 0.5 + Math.sin(G.T * 2 + i) * 0.4; star(c, hash(i) * W, hash(i + 3) * H * 0.9, 3 + hash(i + 7) * 4); c.fill(); }
  c.globalAlpha = 1;
}
function diaryPage(c, x, y, w, h, d, e, big = true) {
  c.fillStyle = 'rgba(0,0,0,.18)'; rr(c, x + 6, y + 8, w, h, 18); c.fill();
  c.fillStyle = '#fffaf0'; rr(c, x, y, w, h, 18); c.fill();
  c.fillStyle = '#ff9fbd'; rr(c, x, y, w, big ? 56 : 34, 18); c.fill(); c.fillRect(x, y + (big ? 36 : 20), w, big ? 20 : 14);
  text(c, big ? `${DAY_NAMES[d]}の にっき` : DAY_SHORT[d], x + w / 2, y + (big ? 30 : 18), big ? 30 : 20, { color: '#fff' });
  if (!e) { text(c, '？', x + w / 2, y + h / 2 + 10, 40, { color: '#ddd' }); return; }
  const pw = big ? w * 0.36 : w - 20, ph = pw * 0.625;
  const px = big ? x + w - pw / 2 - 24 : x + w / 2, py = big ? y + 70 + ph / 2 : y + 44 + ph / 2;
  if (e.pic) drawFramedPic(c, e.pic, px, py, pw, ph, '#ffc2d4');
  else { c.fillStyle = '#ffeef4'; rr(c, px - pw / 2, py - ph / 2, pw, ph, 10); c.fill(); drawPunyu(c, px, py + ph * 0.38, ph * 0.32, { mood: 'happy' }); }
  if (e.friend) drawCreature(c, e.friend, px + pw * 0.32, py + ph / 2 + (big ? 70 : 34), big ? 34 : 18, { t: G.T, mood: 'happy' });
  for (let i = 0; i < 3; i++) { c.fillStyle = i < e.stars ? '#ffd84a' : '#eee2ea'; star(c, px - pw * 0.3 + i * (big ? 30 : 16), py + ph / 2 + (big ? 40 : 20), big ? 13 : 7); c.fill(); }
  if (!big) return;
  c.strokeStyle = '#f3d6e0'; c.lineWidth = 2;
  for (let i = 0; i < 7; i++) { const ly = y + 100 + i * 44; c.beginPath(); c.moveTo(x + 24, ly + 20); c.lineTo(x + w - pw - 48, ly + 20); c.stroke(); }
  let ly = y + 100;
  for (const l of e.lines) {
    const ls = wrapTo(c, l, w - pw - 80, 23);
    for (const t of ls) { text(c, t, x + 28, ly, 23, { align: 'left' }); ly += 44; }
  }
}
function wrapTo(c, str, maxW, size) {
  c.font = `800 ${size}px "Hiragino Maru Gothic ProN",sans-serif`;
  const out = []; let line = '';
  for (const w of str.split(' ')) { const t = line ? line + ' ' + w : w; if (line && c.measureText(t).width > maxW) { out.push(line); line = w; } else line = t; }
  out.push(line); return out;
}
SCENES.diary = () => {
  G.sound.startBgm('night');
  const d = G.day.dayNo, r = G.day.results;
  const entry = { lines: diaryLines(d, r, G.day.friend ? nameOf(G.day.friend) : null), pic: r.draw ? G.save.pictures[G.save.pictures.length - 1] : null, stars: r.danceStars || 0, friend: G.day.friend };
  finishDay(G.save, d, entry); G.persist();
  talk([{ who: 'punyu', text: 'きょうの ことを にっきに かいたよ！' }]);
  return {
    draw(c) {
      const W = V.W, H = V.H;
      nightSky(c);
      const w = Math.min(W - 40, 820), h = H - 130, x = (W - w) / 2, y = 30;
      diaryPage(c, x, y, w, h, d, entry);
      if (!talking()) {
        if (d < 5) {
          button(c, { x: W / 2 - 40, y: H - 88, w: 330, h: 72 }, `つぎの ひへ（${DAY_SHORT[d + 1]}）`, () => G.startDay(d + 1), { color: '#ff7aa8', ink: '#fff', shadow: '#d9507e', size: 30, pulse: true });
          button(c, { x: W / 2 - 260, y: H - 84, w: 190, h: 64 }, 'タイトルへ', () => G.go('title'), { size: 24 });
        } else button(c, { x: W / 2 - 160, y: H - 88, w: 320, h: 72 }, 'つぎへ', () => G.go('ending'), { color: '#ffd84a', ink: '#7a4a10', shadow: '#d9a520', size: 32, pulse: true });
      }
      hud(c, 'よる', { stickers: true });
    },
  };
};

// ---------- 1しゅうかんの おわり ----------
SCENES.ending = () => {
  G.sound.startBgm('home');
  G.sound.play('fanfare');
  const conf = Array.from({ length: 60 }, (_, i) => ({ x: hash(i) , y: hash(i + 9), s: 0.4 + hash(i + 3), c: ['#ff8fab', '#ffd84a', '#7fc7ff', '#b58cff', '#8fd36a'][i % 5] }));
  return {
    draw(c) {
      const W = V.W, H = V.H;
      c.fillStyle = '#fff4f8'; c.fillRect(0, 0, W, H);
      for (const p of conf) { c.fillStyle = p.c; c.save(); c.translate(p.x * W, (p.y * H + G.T * 60 * p.s) % (H + 20) - 10); c.rotate(G.T * p.s * 3); c.fillRect(-5, -3, 10, 6); c.restore(); }
      text(c, 'ぷにゅの 1しゅうかん', W / 2, 60, 52, { color: '#ff5d86', stroke: '#fff', sw: 12 });
      text(c, 'おしまい', W / 2, 116, 40, { color: '#a07ad0', stroke: '#fff', sw: 10 });
      const pw = Math.min(150, (W - 80) / 5 - 12);
      for (let d = 1; d <= 5; d++) diaryPage(c, W / 2 + (d - 3) * (pw + 12) - pw / 2, 150, pw, pw * 1.15, d, G.save.diary[d], false);
      const kids = ['fuwari', 'gorota', 'pokari', 'punyu', 'chapu', 'popuri', 'kirara'];
      kids.forEach((sp, i) => {
        const x = W / 2 + (i - 3) * Math.min(105, W / 8), hop = Math.max(0, Math.sin(G.T * 5 + i)) * 20, y = H - 110 - hop;
        if (sp === 'punyu') drawPunyu(c, x, y, 46, { mood: 'bliss' }); else drawCreature(c, sp, x, y, 36, { t: G.T, mood: 'happy' });
      });
      text(c, 'あそんでくれて ありがとう！', W / 2, H - 76 + 30, 24, { stroke: '#fff', sw: 7 });
      button(c, { x: W - 220, y: H - 80, w: 200, h: 62 }, 'タイトルへ', () => G.go('title'), { color: '#ff7aa8', ink: '#fff', shadow: '#d9507e', size: 26 });
    },
  };
};

Object.assign(SCENES, LESSONS, HOME);

// ---------- うごかす ----------
const canvasEl = document.getElementById('world');
const ctx = initCanvas(canvasEl);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  G.T += dt;
  updateTalk(dt); updateFx(dt); updateFade(dt);
  beginFrame();
  scene.draw(ctx, dt);
  drawFx(ctx);
  drawBanner(ctx, dt);
  drawTalk(ctx);
  drawFade(ctx);
  endFrame();
  requestAnimationFrame(frame);
}
canvasEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  G.sound.unlock();
  if (fade.dir) return;   // きりかえの とちゅうは さわれない
  const p = toV(e);
  canvasEl.setPointerCapture?.(e.pointerId);
  if (talking()) { if (pointerDownHits(p, true)) return; talkTap(); return; }
  if (pointerDownHits(p)) return;
  scene.down?.(p, e);
});
canvasEl.addEventListener('pointermove', e => { const p = toV(e); scene.move?.(p, e); });
const up = e => { const p = toV(e); if (pointerUpHits(p)) { scene.up?.(p, e, true); return; } scene.up?.(p, e); };
canvasEl.addEventListener('pointerup', up);
canvasEl.addEventListener('pointercancel', up);
document.addEventListener('visibilitychange', () => { if (document.hidden) G.persist(); });

// テスト よう：?debug&scene=dance など
const q = new URLSearchParams(location.search);
if (DEBUG && q.get('scene')) {
  if (q.get('stickers')) G.save.stickers = +q.get('stickers');
  G.day = newDay(+(q.get('day') || 1));
  const sc = q.get('scene'), i = G.day.plan.findIndex(st => st.scene === sc && (!q.get('arg') || st.arg === q.get('arg')));
  const st = G.day.plan[i];
  if (i >= 0) G.day.step = i;
  start(sc, sc === 'period' ? { label: '1じかんめ', name: 'おえかき', icon: '🖍️', next: 'draw', clock: 9 } : st ? st.arg : q.get('arg') || undefined);
} else start('title');
requestAnimationFrame(frame);
window.__G = G;
if (DEBUG) {
  G.auto = q.has('auto'); G.dbgNext = q.has('dbgnext');
  window.__dbg = () => ({ scene: sceneName, talking: talking(), V: { ...V }, hits: hits.map(h => ({ label: h.label || '', x: h.r.x + h.r.w / 2, y: h.r.y + h.r.h / 2 })), save: G.save, day: G.day });
}
