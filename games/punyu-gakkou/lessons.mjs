// じゅぎょう と やすみじかん：おえかき・おにごっこ・なわとび・ダンス・こうさく
import {
  hangPicture, placeCraft, danceChart, judge, findNote, danceRate, danceStars, HIT, beatOf, COUNT_IN,
  ropePeriod, ropeClear, ROPE_GRACE, ROPE_LEAD, mathQuestions, kokugoQuestions, quizStars, raceTap, raceDecay, raceRank, raceStars, RACE_LEN,
  COSTUME_HATS, COSTUME_CAPES, COSTUME_DECOS, defaultCostume, ropeStars, tagStars, JUMP_TIME, ROPE_GOAL, newCraft, addPart, clampPart, craftReady, normalizeCraft,
} from './core.mjs';
import { TEACHER, PEN_COLORS, PEN_SIZES, POSES, SONGS, GAME_NAMES, GAME_INVITE, CRAFT_BASES, CRAFT_COLORS, CRAFT_PARTS, CLASSMATES } from './data.mjs';
import { DAYS } from './story.mjs';
import {
  G, V, button, hitArea, talk, talking, panel, hud, drawPunyu, drawCreature, text, emoji, rr, circ, ell, star,
  burst, floatText, showBanner, ease, clamp, lerp, inRect, drawSpeech, hash, heartPath,
} from './ui.mjs';
import { drawClassroom, drawDesk, drawSchoolyard, drawGym, drawKidArt, drawFramedPic, drawCraft, drawBase, drawPart, drawMusicRoom, drawStage, drawAudience, drawKeyboard, drawCostumed, drawHat } from './art.mjs';

export const LESSONS = {};
const PINK = { color: '#ff7aa8', ink: '#fff', shadow: '#d9507e' };

// ================= おえかき =================
LESSONS.draw = (arg = {}) => {
  const poster = arg.theme === 'poster';
  G.sound.startBgm('school');
  const PW = 800, PH = 500;
  const paper = document.createElement('canvas'); paper.width = PW; paper.height = PH;
  const pc = paper.getContext('2d');
  pc.fillStyle = '#fff'; pc.fillRect(0, 0, PW, PH);
  const s = { phase: 'draw', color: PEN_COLORS[1], size: 1, tool: 'pen', stamp: 'star', strokes: 0, used: new Set(), stamps: 0, drawing: false, last: null, clearArm: 0, url: null };
  talk(poster ? [
    { who: TEACHER, text: 'きょうの おえかきは 「はっぴょうかいの ポスター」！' },
    { who: TEACHER, text: 'おどっている ところ、 ほし、 ハート… たのしい ポスターに してね。 たいいくかんに はるよ！' },
  ] : [
    { who: TEACHER, text: 'きょうの おえかきは 「すきな もの」！ なんでも かいて いいよ' },
    { who: TEACHER, text: 'ひだりで いろ、 みぎで ふとさ や スタンプを えらべるよ' },
  ]);
  const L = () => {
    const w = Math.min(V.W - 320, (V.H - 160) * 1.6), h = w / 1.6;
    return { x: V.W / 2 - w / 2, y: 72, w, h };
  };
  const toPaper = (r, p) => ({ x: (p.x - r.x) / r.w * PW, y: (p.y - r.y) / r.h * PH });
  function dot(pt) {
    const k = PW / L().w;
    if (s.tool === 'stamp') { stampAt(pc, s.stamp, pt.x, pt.y, 34 * k, s.color); s.stamps++; s.used.add(s.color); G.sound.play('stamp'); return; }
    pc.fillStyle = s.tool === 'eraser' ? '#fff' : s.color;
    circ(pc, pt.x, pt.y, (s.tool === 'eraser' ? 22 : PEN_SIZES[s.size] / 2) * k); pc.fill();
  }
  function line(a, b) {
    const k = PW / L().w;
    pc.strokeStyle = s.tool === 'eraser' ? '#fff' : s.color;
    pc.lineWidth = (s.tool === 'eraser' ? 44 : PEN_SIZES[s.size]) * k;
    pc.lineCap = 'round'; pc.lineJoin = 'round';
    pc.beginPath(); pc.moveTo(a.x, a.y); pc.lineTo(b.x, b.y); pc.stroke();
  }
  function finish() {
    const th = document.createElement('canvas'); th.width = 400; th.height = 250;
    th.getContext('2d').drawImage(paper, 0, 0, 400, 250);
    s.url = th.toDataURL('image/jpeg', 0.8);
    hangPicture(G.save, s.url);
    if (poster) G.save.poster = s.url;
    G.persist();
    G.day.results.draw = true;
    s.phase = 'show'; G.sound.play('fanfare');
    const lines = [{ who: TEACHER, text: 'わあ！ すてきな え！ はなまる です！' }];
    const said = [];
    if (s.used.size >= 4) said.push({ who: 'fuwari', text: 'いろが いっぱい！ にじ みたい〜' });
    if (s.stamps >= 3) said.push({ who: 'kirara', text: 'スタンプが キラキラ してる！' });
    if (s.strokes >= 15) said.push({ who: 'gorota', text: 'いっしょうけんめい かいたね！' });
    said.push({ who: 'popuri', text: 'ぷにゅの え、 だいすき！' });
    lines.push(...said.slice(0, 2));
    const got = G.award('draw', 3);
    if (got) lines.push({ text: `シールを ${got}まい もらったよ！ えは おうちに かざろう` });
    lines.push(G.upcomingLine());
    setTimeout(() => talk(lines, () => G.next()), 900);
  }
  return {
    talkAt: 'bottom',
    down(p) {
      if (s.phase !== 'draw') return;
      const r = L();
      if (!inRect(p, r)) return;
      s.drawing = true; s.last = toPaper(r, p); dot(s.last);
      if (s.tool === 'stamp') { s.drawing = false; s.strokes++; burst(p.x, p.y, 'star', 3, s.color); }
      else s.used.add(s.tool === 'pen' ? s.color : 'x');
    },
    move(p) {
      if (!s.drawing) return;
      const pt = toPaper(L(), p);
      line(s.last, pt); s.last = pt; G.sound.play('pen', 0.05);
    },
    up() { if (s.drawing) { s.drawing = false; s.strokes++; } },
    draw(c, dt) {
      const W = V.W, H = V.H, r = L();
      drawClassroom(c, '', { t: G.T });
      c.fillStyle = 'rgba(255,248,240,.55)'; c.fillRect(0, 0, W, H);
      if (s.phase === 'show') return drawShow(c, s);
      // つくえ と かみ
      c.fillStyle = '#e3b27e'; rr(c, r.x - 18, r.y - 14, r.w + 36, r.h + 28, 18); c.fill();
      c.drawImage(paper, r.x, r.y, r.w, r.h);
      c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 2; c.strokeRect(r.x, r.y, r.w, r.h);
      // いろ
      const lx = r.x - 150;
      PEN_COLORS.forEach((col, i) => {
        const x = lx + 8 + (i % 2) * 64, y = r.y + 4 + Math.floor(i / 2) * 64, on = s.color === col && s.tool !== 'eraser';
        hitArea({ x, y, w: 58, h: 58 }, () => { s.color = col; if (s.tool === 'eraser') s.tool = 'pen'; G.sound.play('pick'); }, { instant: true });
        c.fillStyle = on ? '#ffd84a' : 'rgba(255,255,255,.9)'; circ(c, x + 29, y + 29, on ? 30 : 27); c.fill();
        c.fillStyle = col; circ(c, x + 29, y + 29, 21); c.fill();
        if (col === '#ffffff') { c.strokeStyle = '#ddd'; c.lineWidth = 2; c.stroke(); }
      });
      // どうぐ
      const rx = r.x + r.w + 22;
      const tools = [
        ...PEN_SIZES.map((sz, i) => ({ on: s.tool === 'pen' && s.size === i, tap: () => { s.tool = 'pen'; s.size = i; }, draw: (x, y) => { c.fillStyle = s.color === '#ffffff' ? '#ccc' : s.color; circ(c, x, y, Math.max(4, sz / 2)); c.fill(); } })),
        { on: s.tool === 'eraser', tap: () => { s.tool = 'eraser'; }, draw: (x, y) => { c.save(); c.translate(x, y); c.rotate(-0.5); c.fillStyle = '#ffb3c8'; rr(c, -20, -12, 40, 24, 5); c.fill(); c.fillStyle = '#9fd3ff'; rr(c, 4, -12, 16, 24, 4); c.fill(); c.restore(); } },
        ...['star', 'heart', 'flower'].map(st => ({ on: s.tool === 'stamp' && s.stamp === st, tap: () => { s.tool = 'stamp'; s.stamp = st; }, draw: (x, y) => stampAt(c, st, x, y, 22, s.color === '#ffffff' ? '#ffd84a' : s.color) })),
        { on: s.clearArm > 0, tap: () => { if (s.clearArm > 0) { pc.fillStyle = '#fff'; pc.fillRect(0, 0, PW, PH); s.strokes = 0; s.used.clear(); s.stamps = 0; s.clearArm = 0; G.sound.play('whoosh'); } else { s.clearArm = 2.5; } }, draw: (x, y) => { emoji(c, '🗑️', x, y, 30); } },
      ];
      s.clearArm = Math.max(0, s.clearArm - dt);
      tools.forEach((tl, i) => {
        const x = rx + (i % 2) * 64, y = r.y + 4 + Math.floor(i / 2) * 64;
        hitArea({ x, y, w: 58, h: 58 }, () => { tl.tap(); G.sound.play('pick'); }, { instant: true });
        c.fillStyle = tl.on ? '#ffd84a' : 'rgba(255,255,255,.92)'; rr(c, x, y, 58, 58, 16); c.fill();
        tl.draw(x + 29, y + 29);
      });
      if (s.clearArm > 0) drawSpeech(c, rx + 93, r.y + 4 + 3 * 64, 'もういちど おすと\nぜんぶ けすよ', 18);
      // した：ぷにゅ と できた
      const by = r.y + r.h + 22;
      drawPunyu(c, r.x + 40, H - 8, 52, { mood: 'happy', look: 0.6, rot: Math.sin(G.T * 8) * 0.04 * (s.drawing ? 1 : 0) });
      emoji(c, '🖍️', r.x + 96, H - 70 + Math.sin(G.T * 14) * (s.drawing ? 6 : 0), 36);
      const ready = s.strokes >= 3;
      button(c, { x: r.x + r.w - 240, y: Math.min(by, H - 92), w: 240, h: 76 }, 'できた！', finish, { ...PINK, size: 34, disabled: !ready, pulse: ready });
      if (!ready && !talking()) text(c, 'ゆびで かいてみよう', W / 2, Math.min(by, H - 92) + 38, 24, { stroke: '#fff', sw: 7 });
      hud(c, '1じかんめ おえかき');
    },
  };
};
function stampAt(c, kind, x, y, s, color) {
  c.save(); c.fillStyle = color;
  if (kind === 'star') { star(c, x, y, s, s * 0.48); c.fill(); }
  else if (kind === 'heart') { heartPath(c, x, y - s * 0.1, s * 1.6); c.fill(); }
  else { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circ(c, x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5, s * 0.42); c.fill(); } c.fillStyle = '#ffd84a'; circ(c, x, y, s * 0.32); c.fill(); }
  c.restore();
}
// みんなの え と ならべて はりだす
function drawShow(c, s) {
  const W = V.W, H = V.H;
  c.fillStyle = '#f7e2c4'; rr(c, 20, 66, W - 40, H * 0.62, 20); c.fill();
  c.fillStyle = '#e9cfa6'; for (let i = 0; i < 30; i++) { circ(c, 40 + hash(i) * (W - 80), 80 + hash(i + 4) * H * 0.58, 3); c.fill(); }
  const cw = Math.min(380, W * 0.42), ch = cw * 0.625, cx = W / 2, cy = 66 + H * 0.31;
  drawFramedPic(c, s.url, cx, cy, cw, ch, '#ff9fbd');
  // はなまる
  c.save(); c.translate(cx + cw / 2 - 30, cy - ch / 2 + 24); c.rotate(G.T * 0.5);
  c.strokeStyle = '#ff5d6c'; c.lineWidth = 5;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 22, Math.sin(a) * 22, 12, 0, Math.PI * 2); c.stroke(); }
  c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 1.8); c.stroke();
  c.restore();
  const kw = Math.min(140, (W / 2 - cw / 2 - 60) / 1), kh = kw * 0.75;
  CLASSMATES.forEach((sp, i) => {
    const side = i < 3 ? -1 : 1, row = i % 3;
    const x = cx + side * (cw / 2 + 30 + kw / 2) - kw / 2, y = 84 + row * (kh + 18);
    drawKidArt(c, sp, x, y, kw, kh);
  });
  drawPunyu(c, W * 0.5, H - 20, 64, { mood: 'bliss' });
  hud(c, '1じかんめ おえかき');
}

// ================= やすみじかん =================
LESSONS.recess = () => {
  G.sound.startBgm('school');
  G.day.clock = 10.2;
  talk([{ text: 'やすみじかん！ だれと あそぶ？ ともだちを タッチしてね' }]);
  return {
    draw(c) {
      const W = V.W, H = V.H;
      drawSchoolyard(c, G.T);
      const gy = H * 0.52;
      // あそんでいる みんな
      const busy = DAYS[G.day.dayNo].recess.map(r => r.sp);
      c.fillStyle = '#e8c88e'; ell(c, W * 0.86, gy + 82, 70, 18); c.fill();
      [['chapu', 0.86, 70], ['fuwari', 0.12, 60], ['kirara', 0.2, 75], ['gorota', 0.72, 64], ['popuri', 0.8, 60], ['pokari', 0.28, 64]]
        .filter(([sp]) => !busy.includes(sp)).slice(0, 4)
        .forEach(([sp, fx, dy], i) => drawCreature(c, sp, W * fx, gy + dy, 30, { t: G.T + i, mood: 'happy' }));
      DAYS[G.day.dayNo].recess.forEach((rc, i) => {
        const x = W * (i ? 0.66 : 0.32), y = H - 70, r = 54;
        const hop = Math.max(0, Math.sin(G.T * 4 + i * 2)) * 10;
        c.fillStyle = 'rgba(255,255,255,.55)'; ell(c, x, y + 4, 90, 22); c.fill();
        drawCreature(c, rc.sp, x, y - hop, r, { t: G.T, mood: 'happy' });
        drawSpeech(c, x, y - 130, `${GAME_INVITE[rc.game]}\n${GAME_NAMES[rc.game][1]} ${GAME_NAMES[rc.game][0]}`, 24, { maxW: 280 });
        hitArea({ label: 'recess:' + rc.game, x: x - 100, y: y - 230, w: 200, h: 250 }, () => { if (talking()) return; G.sound.play('yay'); G.day.friend = rc.sp; G.go(rc.game, rc.arg); }, { instant: true });
      });
      drawPunyu(c, W * 0.49, H - 40, 46, { mood: 'happy' });
      hud(c, 'やすみじかん');
    },
  };
};
function recessDone(sp, stars, line) {
  G.day.results.recess = true; G.day.results.recessStars = stars;
  const got = G.award('recess', 2);
  setTimeout(() => talk([
    { who: sp, text: line },
    got ? { text: `${'⭐'.repeat(stars)}  シールを ${got}まい もらったよ！` } : null,
    { who: 'punyu', text: G.upcoming() ? `あっ チャイムだ！ つぎは ${G.upcoming()}！` : 'あっ チャイムだ！' },
  ], () => G.next()), 1200);
}

// ---------- おにごっこ ----------
LESSONS.tag = () => {
  G.sound.startBgm('school');
  const sp = 'pokari';
  const s = { phase: 'intro', p: { x: 0, y: 0 }, f: { x: 0, y: 0 }, target: null, caught: 0, freeze: 0, time: 0, say: null, sayT: 0, wob: 0, inited: false };
  const field = () => ({ x: 50, y: V.H * 0.52 + 50, w: V.W - 100, h: V.H * 0.48 - 80 });
  talk([
    { who: sp, text: 'ぼくが にげるよ！ ぷにゅが おに ね！' },
    { who: sp, text: 'がめんを ゆびで おすと、 ぷにゅが そっちに はしるよ。 3かい タッチしてね！' },
  ], () => { s.phase = 'play'; });
  const speeds = [175, 215, 250];
  if (G.auto) window.__tagPos = () => s.f;
  return {
    down(p) { s.target = p; },
    move(p) { if (s.target) s.target = p; },
    up() { s.target = null; },
    draw(c, dt) {
      const W = V.W, H = V.H, F = field();
      if (!s.inited) { s.p = { x: F.x + F.w * 0.25, y: F.y + F.h * 0.6 }; s.f = { x: F.x + F.w * 0.75, y: F.y + F.h * 0.4 }; s.inited = true; }
      drawSchoolyard(c, G.T);
      if (s.phase === 'play' && !talking()) {
        s.time += dt;
        if (s.freeze > 0) s.freeze -= dt;
        else {
          // ぷにゅ
          if (s.target) {
            const dx = s.target.x - s.p.x, dy = s.target.y - s.p.y, d = Math.hypot(dx, dy);
            if (d > 6) { const m = Math.min(d, 320 * dt); s.p.x += dx / d * m; s.p.y += dy / d * m; }
          }
          // ともだち：にげる
          const v = speeds[Math.min(2, s.caught)];
          let ax = s.f.x - s.p.x, ay = s.f.y - s.p.y; const d = Math.hypot(ax, ay) || 1;
          ax /= d; ay /= d;
          const m = 90;
          if (s.f.x < F.x + m) ax += 1.6 * (1 - (s.f.x - F.x) / m);
          if (s.f.x > F.x + F.w - m) ax -= 1.6 * (1 - (F.x + F.w - s.f.x) / m);
          if (s.f.y < F.y + m) ay += 1.6 * (1 - (s.f.y - F.y) / m);
          if (s.f.y > F.y + F.h - m) ay -= 1.6 * (1 - (F.y + F.h - s.f.y) / m);
          s.wob += dt;
          ax += Math.sin(s.wob * 1.7) * 0.5; ay += Math.cos(s.wob * 2.3) * 0.5;
          const al = Math.hypot(ax, ay) || 1;
          const slow = d > 300 ? 0.45 : d > 200 ? 0.75 : 1;
          s.f.x += ax / al * v * slow * dt; s.f.y += ay / al * v * slow * dt;
          s.f.x = clamp(s.f.x, F.x, F.x + F.w); s.f.y = clamp(s.f.y, F.y, F.y + F.h);
          if (d > 300 && s.sayT <= 0) { s.say = ['こっちだよ〜！', 'つかまえて ごらん！', 'まだまだ〜！'][Math.floor(Math.random() * 3)]; s.sayT = 2.2; }
          if (d < 62) {
            s.caught++; s.freeze = 1.1; G.sound.play('yay'); burst(s.f.x, s.f.y - 40, 'star', 12);
            floatText(s.f.x, s.f.y - 90, 'タッチ！', '#ff5d86', 44);
            s.say = s.caught >= 3 ? 'まいった〜！' : 'つかまった〜！ もういっかい！'; s.sayT = 1.6;
            if (s.caught >= 3) {
              s.phase = 'done'; G.sound.play('fanfare'); showBanner('3かい タッチ！');
              const stars = tagStars(s.time);
              recessDone(sp, stars, 'ぷにゅ はやい〜！ また あそぼうね！');
            } else {
              // はんたいがわへ にげる
              setTimeout(() => { s.f.x = s.p.x < F.x + F.w / 2 ? F.x + F.w - 40 : F.x + 40; s.f.y = F.y + Math.random() * F.h; }, 700);
            }
          }
        }
        s.sayT -= dt;
      }
      // え
      const list = [{ y: s.f.y, d: () => drawCreature(c, sp, s.f.x, s.f.y, 42, { t: G.T * 2, mood: s.freeze > 0 ? 'happy' : 'happy', sq: Math.abs(Math.sin(G.T * 12)) * 0.06 }) },
        { y: s.p.y, d: () => drawPunyu(c, s.p.x, s.p.y, 46, { mood: 'happy', sq: s.target ? Math.abs(Math.sin(G.T * 14)) * 0.06 : 0 }) }];
      list.sort((a, b) => a.y - b.y).forEach(e => e.d());
      if (s.target && s.phase === 'play') { c.strokeStyle = 'rgba(255,93,134,.6)'; c.lineWidth = 4; circ(c, s.target.x, s.target.y, 22 + Math.sin(G.T * 10) * 3); c.stroke(); }
      if (s.say && s.sayT > 0) drawSpeech(c, s.f.x, s.f.y - 92, s.say, 22);
      // タッチの かず
      for (let i = 0; i < 3; i++) { c.fillStyle = i < s.caught ? '#ffd84a' : 'rgba(255,255,255,.8)'; star(c, W / 2 + (i - 1) * 56, 100, 24); c.fill(); }
      hud(c, 'おにごっこ');
    },
  };
};

// ---------- なわとび ----------
LESSONS.rope = () => {
  G.sound.startBgm('school');
  const sp = 'popuri';
  const s = { phase: 'intro', phase01: 0, run: false, jumpT: null, fJumpT: null, count: 0, misses: 0, stop: 0, mood: 'happy', ready: 0, grace: 0, nice: 0 };
  talk([
    { who: sp, text: 'ごろた と ふわりが なわを まわして くれるよ！' },
    { who: sp, text: 'きいろい わっかが ちぢんで あしもとに きたら、 がめんを タッチして ぴょん！' },
    { who: sp, text: 'ひっかかっても すぐ やりなおせるよ。 10かい とぼう！' },
  ], () => { s.phase = 'play'; s.ready = 1.6; });
  const jump = () => {
    if (s.phase !== 'play' || talking() || s.stop > 0) return;
    if (s.jumpT !== null) return;
    s.jumpT = 0; G.sound.play('jump');
    if (s.grace > 0) { s.grace = 0; s.jumpT = 0.1; success(); }   // ちょっと おそくても セーフ
  };
  const cxNow = () => V.W / 2, gyNow = () => V.H * 0.86;
  function success() {
    s.count++; s.nice = 0.5; G.sound.play('perfect'); floatText(cxNow() - 50, gyNow() - 190, `${s.count}`, '#ff5d86', 48);
    if (s.count >= ROPE_GOAL) {
      s.run = false; s.phase = 'done'; G.sound.play('fanfare'); showBanner('10かい とべた！'); burst(cxNow(), gyNow() - 120, 'star', 20);
      G.save.best.rope = Math.max(G.save.best.rope, s.count);
      recessDone(sp, ropeStars(s.misses), s.misses ? 'じょうず〜！ たのしかった！' : 'いっかいも ひっかからなかった！ すごい！');
    }
  }
  function miss() {
    s.misses++; s.run = false; s.stop = 0.9; s.mood = 'yuck'; G.sound.play('trip');
    floatText(cxNow() - 50, gyNow() - 170, 'あっ！ もういっかい！', '#7f8fd9', 36);
  }
  return {
    down: jump,
    draw(c, dt) {
      const W = V.W, H = V.H, cx = W / 2, gy = H * 0.86;
      drawSchoolyard(c, G.T);
      if (s.phase === 'play' && !talking()) {
        if (s.ready > 0) { s.ready -= dt; if (s.ready <= 0) { s.run = true; s.phase01 = 0; } }
        if (s.stop > 0) { s.stop -= dt; if (s.stop <= 0) { s.ready = 1.0; s.mood = 'happy'; } }
        if (s.grace > 0) { s.grace -= dt; if (s.grace <= 0) miss(); }
        s.nice = Math.max(0, s.nice - dt);
        if (s.jumpT !== null) { s.jumpT += dt; if (s.jumpT > JUMP_TIME) s.jumpT = null; }
        if (s.fJumpT !== null) { s.fJumpT += dt; if (s.fJumpT > JUMP_TIME) s.fJumpT = null; }
        if (s.run) {
          const prev = s.phase01;
          s.phase01 += dt / ropePeriod(s.count);
          if (prev < 0.38 && s.phase01 >= 0.38) { s.fJumpT = 0; if (G.auto) jump(); }
          if (prev < 0.5 && s.phase01 >= 0.5) {
            G.sound.play('whoosh');
            if (ropeClear(s.jumpT)) success();
            else if (s.jumpT === null) s.grace = ROPE_GRACE;   // まだ とんでいない：すこしだけ まつ
            else miss();
          }
          if (s.phase01 >= 1) s.phase01 -= 1;
        }
      }
      // なわ
      const hx = Math.min(250, W * 0.3), hy = gy - 60;
      const a = s.phase01 * Math.PI * 2, v = -Math.cos(a);
      const front = Math.sin(a) > 0;
      const drawRope = () => {
        c.strokeStyle = '#ff5d86'; c.lineWidth = 6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(cx - hx + 30, hy); c.quadraticCurveTo(cx, hy + v * 190 + 10, cx + hx - 30, hy); c.stroke();
      };
      if (!front) drawRope();
      drawCreature(c, 'gorota', cx - hx, gy, 46, { t: G.T, mood: 'happy' });
      drawCreature(c, 'fuwari', cx + hx, gy, 46, { t: G.T, mood: 'happy' });
      const jh = t => t === null ? 0 : Math.sin(Math.PI * t / JUMP_TIME) * 80;
      // あしもとの あいず
      // ちぢむ わっか：あしもとに ついた ときが とぶ タイミング
      if (s.run) {
        const per = ropePeriod(s.count), ideal = 0.5 - ROPE_LEAD / per;
        let left = (ideal - s.phase01) * per;
        if (left < -0.3) left += per;
        if (left <= 0.7 && left >= -0.12) {
          const k = Math.max(0, left / 0.7);
          c.strokeStyle = left <= 0.06 ? '#ff5d86' : '#ffc93a'; c.lineWidth = 7;
          ell(c, cx - 50, gy + 2, 46 + k * 110, 12 + k * 30); c.stroke();
          if (left <= 0.06) text(c, 'いま！', cx - 50, gy - 120, 34, { color: '#ff5d86', stroke: '#fff', sw: 8 });
        }
        c.fillStyle = 'rgba(255,216,74,.45)'; ell(c, cx - 50, gy + 2, 46, 12); c.fill();
      }
      if (s.nice > 0) text(c, 'ナイス！', cx - 50, gy - 150 - (0.5 - s.nice) * 40, 30, { color: '#ff9f43', stroke: '#fff', sw: 7 });
      drawCreature(c, sp, cx + 55, gy - jh(s.fJumpT), 40, { t: G.T, mood: 'happy' });
      drawPunyu(c, cx - 50, gy - jh(s.jumpT), 46, { mood: s.mood, sq: s.jumpT !== null ? -0.06 : 0 });
      if (front) drawRope();
      // かず
      panel(c, W / 2 - 110, 74, 220, 66, { fill: 'rgba(255,255,255,.92)' });
      text(c, `${s.count} / ${ROPE_GOAL}`, W / 2, 108, 40, { color: '#ff5d86' });
      if (s.phase === 'play' && s.ready > 0 && !talking()) text(c, s.ready > 0.65 ? 'せーの…' : 'スタート！', W / 2, H * 0.36, 56, { color: '#ff5d86', stroke: '#fff', sw: 12 });
      if (s.phase === 'play' && !talking()) button(c, { x: W - 200, y: H - 120, w: 170, h: 96 }, '', null, { color: '#ffb347', ink: '#fff', shadow: '#d98a20', size: 36 });
      if (s.phase === 'play' && !talking()) { text(c, 'ぴょん！', W - 115, H - 72, 36, { color: '#fff' }); hitArea({ x: W - 200, y: H - 120, w: 170, h: 96 }, jump, { instant: true }); }
      hud(c, 'なわとび');
    },
  };
};

// ================= ダンス（リズムの しくみは ダンス・おんがく・リハーサル・れんしゅう・はっぴょうかいで おなじ） =================
const APPROACH = 1.7;
const KEYS = [{ name: 'ド', color: '#ff7aa8', note: 72 }, { name: 'ソ', color: '#5cc8ff', note: 79 }];
const MODES = {
  dance: { label: n => `${n}じかんめ ダンス`, bg: 'gym', key: 'dance' },
  music: { label: n => `${n}じかんめ おんがく`, bg: 'music', key: 'music' },
  rehearsal: { label: () => 'リハーサル', bg: 'stage', key: 'rehearsal' },
  pair: { label: () => 'ダンスの れんしゅう', bg: 'yard', key: 'pair' },
  recital: { label: () => 'ダンス はっぴょうかい', bg: 'recital', key: 'recital' },
};
const periodNo = () => { const st = G.day.plan[G.day.step]; return st?.period?.label?.[0] || '2'; };
function introLines(mode, arg) {
  const song = SONGS[arg.song];
  const first = !G.save.best.kirakira && !G.day.results.danceTried;
  if (mode === 'music') return [
    { who: TEACHER, text: 'おんがくの じかん です！ けんばんハーモニカを だしてね' },
    { who: TEACHER, text: `きょくは 「${song.name}」。 ひかりが きたら 「ド」 と 「ソ」 の けんばんを おしてね` },
  ];
  if (mode === 'pair') return [
    { who: 'chapu', text: 'ぼく、 ひかりを みてると あわてちゃうんだ…' },
    { who: 'punyu', text: 'ゆっくりで だいじょうぶ！ ぼくの まねを してみて！' },
    { who: 'chapu', text: 'うん！ いっしょに おどろう！' },
  ];
  if (mode === 'rehearsal') return [
    { who: TEACHER, text: G.day.dayNo === 5 ? 'ほんばん まえの さいごの れんしゅう です！ まえ はんぶんを おどろう' : 'はっぴょうかいの リハーサル です！ ぶたいで さいごまで おどってみよう' },
    G.save.costume ? { who: 'punyu', text: 'つくった いしょうを きて おどるよ！' } : null,
  ];
  if (mode === 'recital') return [
    { text: 'たいいくかんは みにきた みんなで いっぱい！' },
    { who: 'dora', text: 'ぷにゅ〜！ がんばれ〜！' },
    { who: TEACHER, text: 'それでは はじめます！ 「ぷにゅぷにゅ ダンス」！' },
    { who: 'punyu', text: 'よーし… みんな、 いくよ！' },
  ];
  const lines = [{ who: TEACHER, text: arg.part === 1 ? `はっぴょうかいの きょく 「${song.name}」！ きょうは まえ はんぶんを れんしゅう しよう` : `ダンスの じかん です！ きょくは 「${song.name}」♪` }];
  if (first) lines.push(
    { who: TEACHER, text: 'うえから ひかりが おりてくるよ。 ボタンに かさなったら おなじ ボタンを タッチ！' },
    { who: TEACHER, text: 'タッチすると ぷにゅが ポーズを するよ。 リズムに のってね！' });
  else if (arg.song === 'pop') lines.push({ who: 'kirara', text: 'きのうより ちょっと はやい きょく だね！' });
  return lines;
}
function rhythmScene(mode, arg = {}) {
  const M = MODES[mode], song = SONGS[arg.song || 'kirakira'], lanes = song.lanes, BEAT = beatOf(arg.song || 'kirakira');
  const isMusic = song.kind === 'music';
  G.sound.startBgm('school');
  const s = { phase: 'intro', notes: [], perfect: 0, good: 0, combo: 0, maxCombo: 0, pose: -1, poseT: 9, judge: null, judgeT: 0, tries: 0, stars: 0, rate: 0, flash: [0, 0, 0, 0], cheer: [] };
  talk(introLines(mode, arg), () => { s.phase = 'ready'; G.day.results.danceTried = true; });
  const startSong = () => {
    s.notes = danceChart(arg.song, arg.part).map(n => ({ ...n, done: false, res: null }));
    s.perfect = 0; s.good = 0; s.combo = 0; s.maxCombo = 0; s.judge = null; s.got = 0;
    s.tries++; s.phase = 'play';
    G.sound.startSong(arg.song, arg.part, 0.8);
  };
  const tapLane = (lane) => {
    s.pose = lane; s.poseT = 0; s.flash[lane] = 1;
    if (isMusic) G.sound.kenban(KEYS[lane].note);
    if (s.phase !== 'play') return;
    const now = G.sound.songTime();
    const n = findNote(s.notes, lane, now);
    if (!n) return;
    const j = judge(now - n.t);
    if (!j) return;
    n.done = true; n.res = j;
    if (j === 'perfect') s.perfect++; else s.good++;
    s.combo++; s.maxCombo = Math.max(s.maxCombo, s.combo);
    s.judge = j; s.judgeT = 0.6;
    if (!isMusic) G.sound.play(j);
  };
  const finish = () => {
    s.phase = 'result'; G.sound.stopSong(); G.sound.startBgm('school');
    s.rate = danceRate(s.perfect, s.good, s.notes.length); s.stars = danceStars(s.rate);
    G.save.best[arg.song] = Math.max(G.save.best[arg.song] || 0, s.stars); G.persist();
    if (mode === 'recital') {
      G.sound.applause(3.5); G.sound.play('fanfare'); burst(V.W * 0.3, V.H * 0.4, 'star', 30); burst(V.W * 0.3, V.H * 0.4, 'heart', 16);
      s.stars = Math.max(1, s.stars);   // はっぴょうかいは さいごまで おどれば はなまる
      G.day.results.recital = true; G.day.results.danceStars = Math.max(G.day.results.danceStars || 0, s.stars);
      s.got = G.award('recital', 3 + s.stars);
    } else if (s.stars > 0) {
      G.sound.play('fanfare'); burst(V.W / 2, V.H * 0.3, 'star', 24);
      markDone();
    }
  };
  const markDone = () => {
    if (mode === 'pair') return;
    G.day.results[M.key] = true;
    if (mode !== 'music') G.day.results.danceStars = Math.max(G.day.results.danceStars || 0, s.stars);
    s.got = G.award(M.key, 1 + s.stars);
  };
  const next = () => {
    if (mode === 'pair') return recessDone('chapu', Math.max(1, s.stars), s.stars ? 'ぷにゅの おかげで わかってきた！ ありがとう！' : 'むずかしいけど… たのしかった！ ありがとう ぷにゅ！');
    if (mode === 'recital') return talk([
      { text: 'たいいくかんに おおきな はくしゅが ひびいた！' },
      { who: 'dora', text: 'すごかった〜！ ぷにゅ かっこいい〜！' },
      { who: 'chapu', text: 'さいごまで おどれた！ やったあ！' },
      { who: TEACHER, text: 'みんな はなまる です！ はなまる メダルを どうぞ！' },
      s.got ? { text: `シールを ${s.got}まい もらったよ！` } : null,
    ], () => G.next());
    if (!G.day.results[M.key]) { s.stars = 0; markDone(); }
    talk([
      mode === 'music' ? { who: TEACHER, text: 'きれいな おとが でました！' } : { who: TEACHER, text: 'みんな じょうずに おどれました！' },
      G.upcomingLine(),
    ], () => G.next());
  };
  const layout = () => {
    const lw = Math.min(110, (V.W - 420) / 4) * (lanes === 2 ? 1.25 : 1);
    const x0 = mode === 'recital' ? V.W - lw * lanes - 30 : V.W / 2 - lw * lanes / 2;
    return { lw, x0, top: 92, hitY: V.H - 96 };
  };
  const poseSt = (lane, t, base = {}) => {
    const k = clamp(1 - t / 0.45, 0, 1);
    if (isMusic) return { ...base, sq: 0.06 * k };
    if (lane === 0) return { ...base, sq: -0.14 * k, lift: 26 * k };
    if (lane === 1) return { ...base, rot: -0.38 * k, dx: -14 * k };
    if (lane === 2) return { ...base, rot: 0.38 * k, dx: 14 * k };
    if (lane === 3) return { ...base, rot: t < 0.45 ? (t / 0.45) * Math.PI * 2 : 0 };
    return base;
  };
  const laneColor = i => isMusic ? KEYS[i].color : POSES[i].color;
  const costume = (mode === 'recital' || mode === 'rehearsal') ? G.save.costume : null;
  if (G.auto) window.__rhythm = s;
  return {
    draw(c, dt) {
      const W = V.W, H = V.H, Lo = layout();
      const now = s.phase === 'play' ? G.sound.songTime() : -9;
      const beat = now / BEAT;
      if (M.bg === 'gym') drawGym(c, G.T);
      else if (M.bg === 'music') drawMusicRoom(c);
      else if (M.bg === 'yard') drawSchoolyard(c, G.T);
      else drawStage(c, G.T, { recital: mode === 'recital', lights: s.phase === 'play' ? beat : G.T });
      if (s.phase === 'play' && now > 0) { const b = 1 - (beat % 1); c.fillStyle = `rgba(255,220,240,${b * (mode === 'recital' ? 0.1 : 0.18)})`; c.fillRect(0, 0, W, H); }
      if (s.phase === 'play') {
        for (const n of s.notes) if (!n.done && now - n.t > HIT.good) { n.done = true; n.res = 'miss'; s.combo = 0; s.judge = 'miss'; s.judgeT = 0.5; }
        if (now > s.notes[s.notes.length - 1].t + 1.6) finish();
      }
      if (G.auto && s.phase === 'play') for (const n of s.notes) if (!n.done && Math.abs(now - n.t) < 0.03) tapLane(n.lane);
      s.poseT += dt; s.judgeT -= dt;
      // おてほん：いまの おんぷの ポーズ
      let demo = -1, demoT = 9;
      if (s.phase === 'play') for (const n of s.notes) { if (n.t <= now) { demo = n.lane; demoT = now - n.t; } else break; }
      const bounce = s.phase === 'play' && now > 0 ? Math.abs(Math.sin(beat * Math.PI)) * 8 : Math.abs(Math.sin(G.T * 3)) * 4;
      const pst = poseSt(s.pose, s.poseT, { mood: s.judge === 'miss' && s.judgeT > 0 ? 'normal' : 'happy' });
      const dst = (sp, i) => poseSt(demo, demoT + (mode === 'pair' ? 0.12 : 0), { t: G.T + i, mood: 'happy' });
      if (mode === 'recital' || mode === 'rehearsal') {
        // ぶたい：うしろに みんな、まえに ぷにゅ
        const cx = mode === 'recital' ? Math.min(W * 0.32, Lo.x0 / 2 + 20) : Lo.x0 / 2;
        const back = mode === 'recital' ? ['fuwari', 'gorota', 'pokari', 'chapu', 'popuri', 'kirara'] : ['chapu', 'popuri', 'gorota'];
        back.forEach((sp, i) => {
          const n = back.length, x = cx + (i - (n - 1) / 2) * Math.min(92, (cx * 2 - 30) / n), y = H * 0.5 + 34 + (i % 2) * 20;
          const st = dst(sp, i);
          drawCreature(c, sp, x + (st.dx || 0), y - bounce - (st.lift || 0), 32, st);
        });
        if (mode === 'recital') { c.fillStyle = 'rgba(255,250,210,.22)'; c.beginPath(); c.moveTo(cx - 40, 0); c.lineTo(cx + 40, 0); c.lineTo(cx + 140, H * 0.8); c.lineTo(cx - 140, H * 0.8); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,.35)'; ell(c, cx, H * 0.74 + 6, 90, 20); c.fill();
        drawCostumed(c, cx + (pst.dx || 0), H * 0.74 - bounce - (pst.lift || 0), 62, pst, costume);
        if (mode === 'recital') drawAudience(c, Lo.x0 - 10, G.T, s.phase === 'result');
        if (s.combo >= 5) text(c, `${s.combo} コンボ！`, cx, H * 0.74 - 160, 30, { color: '#ff5d86', stroke: '#fff', sw: 8 });
      } else {
        const rx0 = Lo.x0 + Lo.lw * lanes + 20;
        const side = mode === 'pair' ? [] : isMusic ? ['popuri', 'gorota', 'fuwari', 'kirara'] : ['kirara', 'chapu', 'fuwari', 'gorota'];
        side.forEach((sp, i) => {
          const x = rx0 + (W - rx0) * (i % 2 ? 0.7 : 0.32), y = H * 0.5 + 60 + Math.floor(i / 2) * 140;
          const st = isMusic ? { t: G.T + i, mood: 'happy', sq: Math.abs(Math.sin(beat * Math.PI + i)) * 0.05 } : dst(sp, i);
          drawCreature(c, sp, x + (st.dx || 0), y - (isMusic ? 0 : bounce) - (st.lift || 0), 34, st);
          if (isMusic) drawKeyboard(c, x, y + 4, 54, -1);
        });
        const x = Math.max(110, Lo.x0 / 2), y = H * 0.78;
        c.fillStyle = 'rgba(255,255,255,.35)'; ell(c, x, y + 6, 90, 20); c.fill();
        if (mode === 'pair') {
          const st = dst('chapu', 0);
          drawCreature(c, 'chapu', rx0 + (W - rx0) * 0.45 + (st.dx || 0), y - bounce - (st.lift || 0), 54, st);
          if (s.phase === 'play' && s.combo >= 3) drawSpeech(c, rx0 + (W - rx0) * 0.45, y - 130, s.combo >= 8 ? 'できてる できてる！' : 'こう かな？', 22);
        }
        drawPunyu(c, x + (pst.dx || 0), y - bounce - (pst.lift || 0), 64, pst);
        if (isMusic) drawKeyboard(c, x, y + 10, 120, s.poseT < 0.2 ? s.pose : -1);
        if (s.combo >= 5) text(c, `${s.combo} コンボ！`, x, y - 170, 30, { color: '#ff5d86', stroke: '#fff', sw: 8 });
      }
      // レーン
      for (let i = 0; i < lanes; i++) {
        const x = Lo.x0 + i * Lo.lw;
        c.fillStyle = i % 2 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.32)';
        rr(c, x + 4, Lo.top, Lo.lw - 8, Lo.hitY - Lo.top + 40, 18); c.fill();
      }
      if (s.phase === 'play') for (const n of s.notes) {
        if (n.done) continue;
        const k = (n.t - now) / APPROACH;
        if (k > 1) break;
        const y = lerp(Lo.hitY, Lo.top, k), x = Lo.x0 + (n.lane + 0.5) * Lo.lw, r = Math.min(Lo.lw, 110) * 0.36;
        c.fillStyle = laneColor(n.lane); circ(c, x, y, r); c.fill();
        c.fillStyle = 'rgba(255,255,255,.85)'; circ(c, x, y, r * 0.6); c.fill();
        if (isMusic) text(c, KEYS[n.lane].name, x, y + 2, r * 0.7, { color: laneColor(n.lane) }); else poseIcon(c, n.lane, x, y, r * 0.55, laneColor(n.lane));
      }
      for (let i = 0; i < lanes; i++) {
        s.flash[i] = Math.max(0, s.flash[i] - dt * 4);
        const x = Lo.x0 + (i + 0.5) * Lo.lw, r = Math.min(Lo.lw, 110) * 0.44, col = laneColor(i);
        c.fillStyle = 'rgba(0,0,0,.15)'; circ(c, x, Lo.hitY + 6, r); c.fill();
        c.fillStyle = '#fff'; circ(c, x, Lo.hitY, r); c.fill();
        c.strokeStyle = col; c.lineWidth = 8 + s.flash[i] * 6; circ(c, x, Lo.hitY, r - 4); c.stroke();
        if (isMusic) text(c, KEYS[i].name, x, Lo.hitY, r * 0.8, { color: col });
        else { poseIcon(c, i, x, Lo.hitY - 6, r * 0.42, col); text(c, POSES[i].name, x, Lo.hitY + r * 0.55, 15, { color: col }); }
        if (s.phase === 'play' || s.phase === 'ready') hitArea({ x: x - Lo.lw / 2, y: Lo.hitY - Lo.lw * 0.7, w: Lo.lw, h: Lo.lw * 1.5 }, () => tapLane(i), { instant: true });
      }
      if (s.judge && s.judgeT > 0) {
        const lab = { perfect: 'かんぺき！', good: 'いいね！', miss: 'おしい' }[s.judge];
        text(c, lab, Lo.x0 + Lo.lw * lanes / 2, Lo.hitY - 150 - (0.6 - s.judgeT) * 30, 40, { color: s.judge === 'perfect' ? '#ff5d86' : s.judge === 'good' ? '#ff9f43' : '#8a8fb5', stroke: '#fff', sw: 9 });
      }
      if (s.phase === 'play' && now < COUNT_IN * BEAT && now > -0.5) {
        const n = Math.floor(now / BEAT);
        text(c, n < 0 ? '' : ['1', '2', '3', 'スタート！'][n] || '', W / 2, H * 0.32, 72, { color: '#ff5d86', stroke: '#fff', sw: 14 });
      }
      if (s.phase === 'play') {
        const tot = s.notes[s.notes.length - 1].t + 1, k = clamp(now / tot, 0, 1);
        c.fillStyle = 'rgba(255,255,255,.7)'; rr(c, W / 2 - 150, 66, 300, 14, 7); c.fill();
        c.fillStyle = '#ff7aa8'; rr(c, W / 2 - 150, 66, 300 * k, 14, 7); c.fill();
      }
      if (s.phase === 'ready' && !talking()) {
        panel(c, W / 2 - 200, H * 0.2, 400, 150);
        text(c, isMusic ? 'ボタンを おすと おとが でるよ' : 'ボタンを おすと ポーズ！', W / 2, H * 0.2 + 40, 26);
        text(c, `きょく：${song.name}`, W / 2, H * 0.2 + 76, 22, { color: '#a07ad0' });
        button(c, { x: W / 2 - 120, y: H * 0.2 + 96, w: 240, h: 66 }, 'スタート！', startSong, { ...PINK, size: 30, pulse: true });
      }
      if (s.phase === 'result' && !talking()) drawDanceResult(c, s, startSong, next, mode);
      hud(c, M.label(periodNo()));
    },
  };
}
LESSONS.dance = arg => rhythmScene('dance', arg);
LESSONS.music = arg => rhythmScene('music', arg);
LESSONS.rehearsal = arg => rhythmScene('rehearsal', arg);
LESSONS.pair = arg => rhythmScene('pair', arg);
LESSONS.recital = arg => rhythmScene('recital', arg);

function poseIcon(c, lane, x, y, s, color) {
  c.save(); c.translate(x, y); c.fillStyle = color; c.strokeStyle = color; c.lineWidth = s * 0.38; c.lineCap = 'round'; c.lineJoin = 'round';
  const arrow = (rot) => { c.save(); c.rotate(rot); c.beginPath(); c.moveTo(0, s); c.lineTo(0, -s * 0.6); c.stroke(); c.beginPath(); c.moveTo(-s * 0.7, -s * 0.1); c.lineTo(0, -s); c.lineTo(s * 0.7, -s * 0.1); c.stroke(); c.restore(); };
  if (lane === 0) arrow(0);
  else if (lane === 1) arrow(-Math.PI / 2);
  else if (lane === 2) arrow(Math.PI / 2);
  else { c.beginPath(); c.arc(0, 0, s * 0.8, -Math.PI * 0.2, Math.PI * 1.35); c.stroke(); c.beginPath(); c.moveTo(s * 0.95, -s * 0.85); c.lineTo(s * 0.7, -s * 0.15); c.lineTo(s * 0.05, -s * 0.45); c.stroke(); }
  c.restore();
}
function drawDanceResult(c, s, again, next, mode) {
  const W = V.W, H = V.H, w = 460, h = 330, x = W / 2 - w / 2, y = H * 0.16;
  panel(c, x, y, w, h);
  const title = mode === 'recital' ? 'だいせいこう！ はなまる！' : mode === 'music' ? (s.stars ? 'じょうずに ひけたね！' : 'おしい！') : (s.stars ? 'ダンス だいせいこう！' : 'おしい！');
  text(c, title, W / 2, y + 44, 34, { color: '#ff5d86' });
  for (let i = 0; i < 3; i++) {
    const on = i < s.stars;
    c.fillStyle = on ? '#ffd84a' : '#eee2ea'; c.strokeStyle = on ? '#ffb21e' : '#ddd'; c.lineWidth = 4;
    star(c, W / 2 + (i - 1) * 80, y + 112, 34); c.fill(); c.stroke();
  }
  text(c, `かんぺき ${s.perfect}   いいね ${s.good}`, W / 2, y + 170, 24);
  if (s.got) text(c, `シールを ${s.got}まい もらったよ！`, W / 2, y + 204, 22, { color: '#e08a00' });
  else if (!s.stars) text(c, 'ひかりが ボタンに かさなったら タッチ！', W / 2, y + 204, 20, { color: '#a07ad0' });
  const canNext = s.stars > 0 || s.tries >= 2 || mode === 'pair';
  const bw = canNext ? 190 : 240;
  button(c, { x: canNext ? W / 2 - bw - 10 : W / 2 - bw / 2, y: y + h - 92, w: bw, h: 68 }, mode === 'recital' ? 'アンコール' : 'もういちど', again, { size: 28 });
  if (canNext) button(c, { x: W / 2 + 10, y: y + h - 92, w: bw, h: 68 }, 'つぎへ', next, { ...PINK, size: 28, pulse: true });
}

// ================= こうさく =================
const PART_COLORS = ['#ff5d86', '#ffd84a', '#7fc7ff', '#8fd36a', '#b58cff', '#ff9f43', '#ffffff'];
LESSONS.craft = () => {
  G.sound.startBgm('school');
  const s = { phase: 'base', craft: newCraft('box'), drag: null, sel: null, colorIdx: 0, glow: null, glowT: 0 };
  talk([
    { who: TEACHER, text: 'こうさくの じかん です！ おうちに かざる ものを つくろう' },
    { who: TEACHER, text: 'まずは もとに する ものを えらんでね' },
  ]);
  const L = () => ({ ox: V.W / 2, oy: V.H * 0.8, k: Math.min(1.5, (V.H * 0.8 - 110) / 190) });
  const toLocal = p => { const l = L(); return { x: (p.x - l.ox) / l.k, y: (p.y - l.oy) / l.k }; };
  function finish() {
    const craft = normalizeCraft(s.craft);
    placeCraft(G.save, craft); G.persist();
    G.day.results.craft = true;
    s.phase = 'show'; G.sound.play('fanfare'); burst(V.W / 2, V.H * 0.45, 'star', 22);
    const has = t => craft.parts.some(p => p.type === t);
    const comment = has('wings') ? { who: 'kirara', text: 'はねが ある！ そらを とべそう！' }
      : has('wheels') ? { who: 'pokari', text: 'タイヤ！ びゅーんって はしりそう！' }
      : has('eyes') ? { who: 'chapu', text: 'かおが ついてて かわいい〜！' }
      : { who: 'popuri', text: 'いろが すてき！' };
    const got = G.award('craft', 3);
    setTimeout(() => talk([
      { who: TEACHER, text: 'わあ！ じょうずに できたね！' },
      comment,
      got ? { text: `シールを ${got}まい もらったよ！ つくった ものは おうちに かざろう` } : null,
      G.upcomingLine() || { who: TEACHER, text: 'これで きょうの じゅぎょうは おしまい！' },
    ], () => G.next()), 900);
  }
  return {
    down(p) {
      if (s.phase !== 'deco') return;
      const q = toLocal(p);
      for (let i = s.craft.parts.length - 1; i >= 0; i--) {
        const pt = s.craft.parts[i];
        if (Math.hypot(q.x - pt.x, q.y - pt.y) < 36) { s.drag = { part: pt, ox: q.x - pt.x, oy: q.y - pt.y, sx: p.x, sy: p.y, moved: false }; G.sound.play('pick'); return; }
      }
    },
    move(p) {
      if (!s.drag) return;
      const q = toLocal(p);
      if (Math.hypot(p.x - s.drag.sx, p.y - s.drag.sy) > 8) s.drag.moved = true;
      s.drag.part.x = q.x - s.drag.ox; s.drag.part.y = q.y - s.drag.oy;
    },
    up() {
      if (!s.drag) return;
      const pt = s.drag.part;
      if (!s.drag.moved) { const i = PART_COLORS.indexOf(pt.color); pt.color = PART_COLORS[(i + 1) % PART_COLORS.length]; G.sound.play('pop'); }
      else if (Math.abs(pt.x) > 150 || pt.y < -230 || pt.y > 60) { s.craft.parts.splice(s.craft.parts.indexOf(pt), 1); G.sound.play('whoosh'); }
      else { clampPart(pt); G.sound.play('drop'); }
      s.drag = null;
    },
    draw(c, dt) {
      const W = V.W, H = V.H, l = L();
      drawClassroom(c, '', { t: G.T });
      c.fillStyle = 'rgba(255,248,240,.6)'; c.fillRect(0, 0, W, H);
      // さぎょうだい
      c.fillStyle = '#e3b27e'; ell(c, l.ox, l.oy + 10, 210, 36); c.fill();
      c.fillStyle = '#d29d68'; ell(c, l.ox, l.oy + 6, 190, 28); c.fill();
      if (s.phase === 'show') {
        c.fillStyle = 'rgba(255,240,180,.4)'; c.beginPath(); c.moveTo(l.ox - 60, 0); c.lineTo(l.ox + 60, 0); c.lineTo(l.ox + 220, l.oy + 20); c.lineTo(l.ox - 220, l.oy + 20); c.fill();
        drawCraft(c, s.craft, l.ox, l.oy, l.k * (1 + Math.sin(G.T * 3) * 0.02), { t: G.T });
        drawPunyu(c, l.ox - 250, H - 20, 60, { mood: 'bliss' });
        hud(c, '3じかんめ こうさく');
        return;
      }
      if (s.phase === 'base') {
        text(c, 'どれで つくる？', W / 2, 100, 40, { color: '#ff5d86', stroke: '#fff', sw: 9 });
        CRAFT_BASES.forEach((b, i) => {
          const bw = Math.min(230, (W - 100) / 3), x = W / 2 + (i - 1) * (bw + 20) - bw / 2, y = 150;
          button(c, { x, y, w: bw, h: 300 }, '', () => {
            s.craft.base = b.id; s.craft.color = CRAFT_COLORS[i * 2]; s.phase = 'deco'; G.sound.play('yay');
            if (!s.craft.parts.length) talk([
              { who: TEACHER, text: 'みぎの ぶひんを タッチすると くっつくよ。 ゆびで うごかしてね' },
              { who: TEACHER, text: 'ぶひんを タッチすると いろが かわるよ。 そとに だすと はずれるよ' },
            ]);
          }, { round: 24, tag: 'base:' + b.id });
          c.save(); c.translate(x + bw / 2, y + 220); c.scale(1.1, 1.1); drawBase(c, b.id, CRAFT_COLORS[i * 2]); c.restore();
          text(c, b.name, x + bw / 2, y + 264, 30);
        });
        hud(c, '3じかんめ こうさく');
        return;
      }
      // いろ（ひだり）
      panel(c, 14, 74, 160, 330, { fill: 'rgba(255,255,255,.92)' });
      text(c, 'いろ', 94, 100, 24);
      CRAFT_COLORS.forEach((col, i) => {
        const x = 28 + (i % 2) * 70, y = 122 + Math.floor(i / 2) * 68, on = s.craft.color === col;
        hitArea({ x, y, w: 62, h: 62 }, () => { s.craft.color = col; G.sound.play('pick'); }, { instant: true });
        c.fillStyle = on ? '#ffd84a' : '#f3ecef'; circ(c, x + 31, y + 31, on ? 31 : 28); c.fill();
        c.fillStyle = col; circ(c, x + 31, y + 31, 22); c.fill();
      });
      button(c, { x: 22, y: 420, w: 144, h: 56 }, 'もどる', () => { s.phase = 'base'; }, { size: 22 });
      // ぶひん（みぎ）
      const pw = 3 * 72 + 16, px = W - pw - 14;
      panel(c, px, 74, pw, 4 * 76 + 50, { fill: 'rgba(255,255,255,.92)' });
      text(c, `ぶひん ${s.craft.parts.length} / 14`, px + pw / 2, 100, 22);
      CRAFT_PARTS.forEach((pt, i) => {
        const x = px + 8 + (i % 3) * 72, y = 120 + Math.floor(i / 3) * 76;
        hitArea({ label: 'part:' + pt.id, x, y, w: 68, h: 70 }, () => {
          const col = PART_COLORS[s.colorIdx++ % PART_COLORS.length];
          const spot = { eyes: [0, -80], mouth: [0, -45], ears: [0, -125], horn: [0, -150], wheels: [0, -8], wings: [0, -70], antenna: [0, -150] }[pt.id] || [(hash(s.colorIdx) - 0.5) * 100, -60 - hash(s.colorIdx + 3) * 60];
          const np = addPart(s.craft, pt.id, spot[0], spot[1], col);
          if (np) { s.glow = np; s.glowT = 1; G.sound.play('pop'); } else G.sound.play('no');
        }, { instant: true });
        c.fillStyle = '#fbf3f6'; rr(c, x, y, 66, 68, 14); c.fill();
        c.save(); c.translate(x + 33, y + 30); c.scale(pt.id === 'wings' ? 0.32 : pt.id === 'wheels' ? 0.55 : 0.85, pt.id === 'wings' ? 0.32 : pt.id === 'wheels' ? 0.55 : 0.85); drawPart(c, pt.id, 0, pt.id === 'horn' || pt.id === 'antenna' ? 14 : pt.id === 'ears' ? 10 : 0, PART_COLORS[i % PART_COLORS.length], G.T); c.restore();
        text(c, pt.name, x + 33, y + 58, 14);
      });
      // つくっている もの
      drawCraft(c, s.craft, l.ox, l.oy, l.k, { t: G.T });
      s.glowT = Math.max(0, s.glowT - dt);
      if (s.glow && s.glowT > 0) { c.strokeStyle = `rgba(255,216,74,${s.glowT})`; c.lineWidth = 5; circ(c, l.ox + s.glow.x * l.k, l.oy + s.glow.y * l.k, 40 + (1 - s.glowT) * 20); c.stroke(); }
      const ready = craftReady(s.craft);
      button(c, { x: W / 2 - 110, y: H - 84, w: 220, h: 70 }, 'できた！', finish, { ...PINK, size: 32, disabled: !ready, pulse: ready });
      if (!ready && !talking()) text(c, 'ぶひんを 2つ いじょう つけてね', W / 2, 72 + 26, 22, { stroke: '#fff', sw: 7 });
      hud(c, '3じかんめ こうさく');
    },
  };
};

// ================= さんすう（かぞえっこ） =================
LESSONS.math = () => {
  G.sound.startBgm('school');
  const qs = mathQuestions(G.save.days * 7 + G.save.week.weeks);
  const s = { i: 0, misses: 0, wrong: new Set(), done: false, ok: 0 };
  talk([
    { who: TEACHER, text: 'さんすうの じかん！ 「かぞえっこ」を しよう' },
    { who: TEACHER, text: 'いくつ あるかな？ ゆびで さして かぞえてね。 こたえの ボタンを タッチ！' },
  ]);
  const answer = (n) => {
    const q = qs[s.i];
    if (!q || s.ok > 0 || s.done) return;
    if (n === q.answer) {
      G.sound.play('yay'); burst(V.W / 2, V.H * 0.4, 'star', 12); floatText(V.W / 2, V.H * 0.3, 'せいかい！', '#ff5d86', 48);
      s.ok = 1.1;
    } else { s.misses++; s.wrong.add(n); G.sound.play('no'); floatText(V.W / 2, V.H - 150, 'もういちど かぞえて みよう', '#7f8fd9', 30); }
  };
  return {
    draw(c, dt) {
      const W = V.W, H = V.H;
      drawClassroom(c, '', { t: G.T });
      c.fillStyle = 'rgba(255,248,240,.6)'; c.fillRect(0, 0, W, H);
      if (s.ok > 0) { s.ok -= dt; if (s.ok <= 0) { s.ok = 0; s.wrong.clear(); s.i++; if (s.i >= qs.length) finishQuiz('math', s.misses, 'ぜんぶ かぞえられたね！'); } }
      const q = qs[Math.min(s.i, qs.length - 1)];
      // もんだい
      text(c, `もんだい ${Math.min(s.i + 1, qs.length)} / ${qs.length}`, W / 2, 96, 26, { color: '#a07ad0' });
      const pw = Math.min(W - 80, 700), px = W / 2 - pw / 2, py = 120, ph = 300;
      panel(c, px, py, pw, ph, { fill: '#fffef6', stroke: '#9fd3ff' });
      const drawGroup = (n, gx, gw) => {
        const cols = Math.min(5, n), rows = Math.ceil(n / 5), sz = Math.min(64, gw / (cols + 0.5), 200 / rows);
        for (let k = 0; k < n; k++) {
          const cx = gx + gw / 2 + ((k % 5) - (Math.min(5, n - Math.floor(k / 5) * 5) - 1) / 2) * sz * 1.1;
          const cy = py + 50 + ph / 2 - 40 + (Math.floor(k / 5) - (rows - 1) / 2) * sz * 1.15;
          emoji(c, q.icon, cx, cy + Math.sin(G.T * 3 + k) * 2, sz);
        }
      };
      if (q.kind === 'count') { text(c, `${q.icon} は いくつ？`, W / 2, py + 34, 30); drawGroup(q.a, px + 20, pw - 40); }
      else {
        text(c, `あわせて いくつ？`, W / 2, py + 34, 30);
        const gw = (pw - 120) / 2;
        drawGroup(q.a, px + 20, gw); drawGroup(q.b, px + pw - 20 - gw, gw);
        text(c, '＋', W / 2, py + ph / 2 + 10, 60, { color: '#ff7aa8' });
      }
      // こたえ
      q.choices.forEach((n, k) => {
        const bw = 150, x = W / 2 + (k - 1) * (bw + 30) - bw / 2, y = H - 120;
        const bad = s.wrong.has(n), ok = s.ok > 0 && n === q.answer;
        button(c, { x, y, w: bw, h: 92 }, String(n), () => answer(n), { color: ok ? '#fff3b0' : bad ? '#eee' : '#fff', ink: bad ? '#bbb' : '#5a3d55', size: 54, disabled: bad || talking(), tag: 'ans:' + n });
      });
      drawCreature(c, 'gorota', 70, H - 20, 44, { t: G.T, mood: s.ok > 0 ? 'happy' : 'normal' });
      hud(c, `${periodNo()}じかんめ さんすう`);
    },
  };
};
// しつもんの じゅぎょうの おわり（さんすう・こくご）
function finishQuiz(key, misses, line) {
  const stars = quizStars(misses);
  G.day.results[key] = true;
  const got = G.award(key, 1 + stars);
  G.sound.play('fanfare'); showBanner('よく できました！', '★'.repeat(stars));
  setTimeout(() => talk([
    { who: TEACHER, text: line },
    got ? { text: `シールを ${got}まい もらったよ！` } : null,
    G.upcomingLine(),
  ], () => G.next()), 1400);
}

// ================= こくご（ひらがな あて） =================
LESSONS.kokugo = () => {
  G.sound.startBgm('school');
  const qs = kokugoQuestions(G.save.days * 5 + G.save.week.weeks);
  const s = { i: 0, misses: 0, wrong: new Set(), ok: 0 };
  talk([
    { who: TEACHER, text: 'こくごの じかん！ ことばの あなを うめよう' },
    { who: TEACHER, text: 'えを みて、 あいている ところに はいる ひらがなを えらんでね。 こえに だして よんでみよう！' },
  ]);
  const answer = (ch) => {
    const q = qs[s.i];
    if (!q || s.ok > 0) return;
    if (ch === q.answer) { G.sound.play('yay'); burst(V.W / 2, V.H * 0.35, 'star', 12); s.ok = 1.5; }
    else { s.misses++; s.wrong.add(ch); G.sound.play('no'); }
  };
  return {
    draw(c, dt) {
      const W = V.W, H = V.H;
      drawClassroom(c, '', { t: G.T });
      c.fillStyle = 'rgba(255,248,240,.6)'; c.fillRect(0, 0, W, H);
      if (s.ok > 0) { s.ok -= dt; if (s.ok <= 0) { s.ok = 0; s.wrong.clear(); s.i++; if (s.i >= qs.length) finishQuiz('kokugo', s.misses, 'ひらがな ばっちり！ よく よめたね！'); } }
      const q = qs[Math.min(s.i, qs.length - 1)];
      text(c, `もんだい ${Math.min(s.i + 1, qs.length)} / ${qs.length}`, W / 2, 96, 26, { color: '#a07ad0' });
      const pw = Math.min(W - 80, 640), px = W / 2 - pw / 2, py = 120;
      panel(c, px, py, pw, 300, { fill: '#fffef6', stroke: '#ffc2d4' });
      emoji(c, q.icon, W / 2, py + 90 + Math.sin(G.T * 2) * 4, 110);
      const chars = [...q.word], cw = 96, x0 = W / 2 - chars.length * cw / 2;
      chars.forEach((ch, k) => {
        const x = x0 + k * cw + 8, y = py + 170;
        const hole = k === q.hole && !(s.ok > 0);
        c.fillStyle = hole ? '#fff3b0' : '#f7f1ff'; rr(c, x, y, cw - 16, 100, 16); c.fill();
        if (hole) { c.strokeStyle = '#ffb21e'; c.lineWidth = 4; c.setLineDash([10, 8]); rr(c, x, y, cw - 16, 100, 16); c.stroke(); c.setLineDash([]); text(c, '？', x + (cw - 16) / 2, y + 52, 50, { color: '#e0b030' }); }
        else text(c, ch, x + (cw - 16) / 2, y + 52, 64, { color: k === q.hole ? '#ff5d86' : '#5a3d55' });
      });
      if (s.ok > 0) text(c, `「${q.word}」！`, W / 2, py + 330, 34, { color: '#ff5d86', stroke: '#fff', sw: 8 });
      q.choices.forEach((ch, k) => {
        const bw = 140, x = W / 2 + (k - 1) * (bw + 30) - bw / 2, y = H - 118;
        const bad = s.wrong.has(ch);
        button(c, { x, y, w: bw, h: 96 }, ch, () => answer(ch), { color: bad ? '#eee' : '#fff', ink: bad ? '#bbb' : '#5a3d55', size: 60, disabled: bad || talking() || s.ok > 0, tag: 'ans:' + ch });
      });
      drawCreature(c, 'popuri', W - 70, H - 20, 44, { t: G.T, mood: s.ok > 0 ? 'happy' : 'normal' });
      hud(c, `${periodNo()}じかんめ こくご`);
    },
  };
};

// ================= かけっこ =================
LESSONS.race = (arg = {}) => {
  G.sound.startBgm('school');
  const inRecess = G.day.plan[G.day.step]?.scene !== 'race';   // やすみじかんに えらんだ とき
  const rivals = inRecess ? [G.day.friend, 'gorota'] : ['pokari', 'kirara'];
  const s = { phase: 'intro', me: 0, v: 0, op: [0, 0], ov: [0, 0], t: 0, count: 0, done: false, rank: 0, taps: 0 };
  talk(inRecess ? [{ who: rivals[0], text: 'あそこの はたまで きょうそう だよ！' }, { text: 'がめんを どんどん タッチすると はやく はしるよ！' }]
    : [{ who: TEACHER, text: 'たいいくの じかん！ きょうは かけっこ です' }, { who: TEACHER, text: 'がめんを どんどん タッチすると はやく はしるよ！ よーい…' }], () => { s.phase = 'count'; s.count = 2.4; });
  const tap = () => {
    if (s.phase !== 'go') return;
    s.v = raceTap(s.v); s.taps++; G.sound.play('pop', 0.04);
  };
  if (G.auto) window.__raceTap = tap;
  const end = () => {
    s.done = true; s.phase = 'done';
    s.rank = raceRank(s.me, s.op);
    const stars = raceStars(s.rank);
    G.sound.play(s.rank === 1 ? 'fanfare' : 'yay'); showBanner(`${s.rank}い！`, s.rank === 1 ? 'いちばん！' : 'がんばったね！');
    if (inRecess) return recessDone(rivals[0], stars, s.rank === 1 ? 'ぷにゅ はやーい！ まけちゃった〜' : 'たのしかったね！ また きょうそう しよう！');
    G.day.results.race = true;
    const got = G.award('race', 1 + stars);
    setTimeout(() => talk([{ who: TEACHER, text: 'みんな さいごまで よく はしりました！' }, got ? { text: `シールを ${got}まい もらったよ！` } : null, G.upcomingLine()], () => G.next()), 1500);
  };
  return {
    down: tap,
    draw(c, dt) {
      const W = V.W, H = V.H;
      drawSchoolyard(c, G.T);
      if (s.phase === 'count') { s.count -= dt; if (s.count <= 0) { s.phase = 'go'; G.sound.play('bell'); } }
      if (s.phase === 'go') {
        s.t += dt;
        s.v = raceDecay(s.v, dt); s.me += s.v * dt * 0.7;
        const base = [10.5, 11.3];
        s.op = s.op.map((p, i) => p + (base[i] + Math.sin(s.t * 2 + i * 3) * 1.6) * dt * 0.7);
        // ぷにゅが ゴール するか、ふたりとも ゴール したら おしまい
        if (s.me >= RACE_LEN || s.op.every(p => p >= RACE_LEN)) end();
      }
      // コース
      const x0 = 110, x1 = W - 120, lane = i => H * 0.585 + i * 80;
      for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? '#e9c98a' : '#efd59c'; c.fillRect(0, lane(i) - 40, W, 80); }
      c.strokeStyle = '#fff'; c.lineWidth = 4; for (let i = 0; i <= 3; i++) { c.beginPath(); c.moveTo(0, lane(i) - 40); c.lineTo(W, lane(i) - 40); c.stroke(); }
      c.fillStyle = '#fff'; c.fillRect(x1, lane(0) - 40, 8, 240);
      for (let k = 0; k < 10; k++) { c.fillStyle = k % 2 ? '#3a2a3a' : '#fff'; c.fillRect(x1 + 8, lane(0) - 40 + k * 24, 10, 24); }
      c.fillStyle = '#ff5d6c'; c.beginPath(); c.moveTo(x1 + 18, lane(0) - 110); c.lineTo(x1 + 70, lane(0) - 92); c.lineTo(x1 + 18, lane(0) - 74); c.fill(); c.fillStyle = '#8a8fa3'; c.fillRect(x1 + 14, lane(0) - 110, 5, 80);
      const pos = p => x0 + (x1 - x0) * clamp(p / RACE_LEN, 0, 1);
      const run = (t, k) => Math.abs(Math.sin(t * k)) * 10;
      rivals.forEach((sp, i) => drawCreature(c, sp, pos(s.op[i]), lane(i === 0 ? 0 : 2) + 22 - (s.phase === 'go' ? run(G.T + i, 14) : 0), 30, { t: G.T, mood: 'happy' }));
      drawPunyu(c, pos(s.me), lane(1) + 24 - (s.phase === 'go' && s.v > 1 ? run(G.T, 10 + s.v * 0.4) : 0), 34, { mood: 'happy', sq: s.v > 20 ? -0.05 : 0 });
      if (s.phase === 'go' && s.v > 18) for (let k = 0; k < 3; k++) { c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(pos(s.me) - 50 - k * 12, lane(1) - k * 10); c.lineTo(pos(s.me) - 80 - k * 12, lane(1) - k * 10); c.stroke(); }
      if (s.phase === 'count') text(c, 'よーい…', W / 2, H * 0.34, 64, { color: '#ff5d86', stroke: '#fff', sw: 12 });
      if (s.phase === 'go' && s.t < 0.8) text(c, 'どん！', W / 2, H * 0.34, 80, { color: '#ff5d86', stroke: '#fff', sw: 14 });
      if (s.phase === 'go' && s.t < 3) text(c, 'がめんを どんどん タッチ！', W / 2, H * 0.45, 30, { stroke: '#fff', sw: 8 });
      hud(c, inRecess ? 'かけっこ' : `${periodNo()}じかんめ たいいく`);
    },
  };
};

// ================= いしょう づくり =================
LESSONS.costume = () => {
  G.sound.startBgm('school');
  const s = { c: { ...(G.save.costume || defaultCostume()) }, done: false };
  talk([
    { who: TEACHER, text: 'こうさくの じかん！ はっぴょうかいで きる いしょうを つくろう' },
    { who: TEACHER, text: 'ぼうし・マント・むねの かざりを えらんでね' },
    { who: 'kirara', text: 'わたしは ほしの マントに する！' },
  ]);
  const finish = () => {
    if (s.done) return; s.done = true;
    G.save.costume = { ...s.c }; G.persist();
    G.day.results.costume = true;
    const got = G.award('costume', 3);
    G.sound.play('fanfare'); burst(V.W * 0.3, V.H * 0.4, 'star', 24); showBanner('いしょう かんせい！');
    setTimeout(() => talk([
      { who: 'pokari', text: 'ぷにゅの いしょう、 かっこいい〜！' },
      { who: TEACHER, text: 'きんようびの はっぴょうかいで きようね！' },
      got ? { text: `シールを ${got}まい もらったよ！` } : null,
      G.upcomingLine(),
    ], () => G.next()), 1200);
  };
  const HAT_NAMES = { crown: 'おうかん', tiara: 'ティアラ', star: 'ほし', flower: 'はなかんむり', bow: 'リボン', top: 'シルクハット' };
  const DECO_NAMES = { sparkle: 'キラキラ', heart: 'ハート', note: 'おんぷ', none: 'なし' };
  return {
    draw(c) {
      const W = V.W, H = V.H;
      drawClassroom(c, '', { t: G.T });
      c.fillStyle = 'rgba(255,240,246,.75)'; c.fillRect(0, 0, W, H);
      const lx = W * 0.25;
      c.fillStyle = '#fff'; circ(c, lx, H * 0.52, 170); c.fill();
      drawCostumed(c, lx, H * 0.52 + 120, 100, { mood: 'happy', sq: Math.sin(G.T * 3) * 0.02 }, s.c);
      const rx = W * 0.5, rw = W * 0.47;
      const row = (y, title, items, cur, onPick, drawItem) => {
        text(c, title, rx + 10, y, 24, { align: 'left', color: '#a07ad0' });
        const bw = Math.min(96, (rw - 10) / items.length - 8);
        items.forEach((it, i) => {
          const x = rx + i * (bw + 8), on = cur === it;
          button(c, { x, y: y + 18, w: bw, h: 88 }, '', () => { onPick(it); G.sound.play('pick'); burst(lx, H * 0.4, 'star', 4); }, { color: on ? '#fff3b0' : '#fff', shadow: on ? '#e8c84a' : '#e4c9d4', round: 18, tag: title + ':' + it, disabled: s.done });
          drawItem(c, it, x + bw / 2, y + 62, bw);
        });
      };
      row(80, 'ぼうし', COSTUME_HATS, s.c.hat, v => { s.c.hat = v; }, (cc, it, x, y) => { drawHat(cc, it, x, y + 6, 54); });
      row(220, 'マント', COSTUME_CAPES, s.c.cape, v => { s.c.cape = v; }, (cc, it, x, y) => { cc.fillStyle = it; cc.strokeStyle = 'rgba(0,0,0,.15)'; cc.lineWidth = 2; cc.beginPath(); cc.moveTo(x - 14, y - 24); cc.quadraticCurveTo(x - 30, y + 10, x - 26, y + 24); cc.lineTo(x + 26, y + 24); cc.quadraticCurveTo(x + 30, y + 10, x + 14, y - 24); cc.closePath(); cc.fill(); cc.stroke(); });
      row(360, 'かざり', COSTUME_DECOS, s.c.deco, v => { s.c.deco = v; }, (cc, it, x, y) => { text(cc, DECO_NAMES[it], x, y, 18); });
      button(c, { x: rx + rw / 2 - 130, y: H - 100, w: 260, h: 78 }, 'できた！', finish, { ...PINK, size: 34, pulse: true, disabled: s.done });
      hud(c, `${periodNo()}じかんめ こうさく`);
    },
  };
};
