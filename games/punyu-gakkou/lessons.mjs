// じゅぎょう と やすみじかん：おえかき・おにごっこ・なわとび・ダンス・こうさく
import {
  hangPicture, placeCraft, danceChart, judge, findNote, danceRate, danceStars, HIT, BEAT, COUNT_IN,
  ropePeriod, ropeClear, ROPE_GRACE, ROPE_LEAD, ropeStars, tagStars, JUMP_TIME, ROPE_GOAL, newCraft, addPart, clampPart, craftReady, normalizeCraft,
} from './core.mjs';
import { TEACHER, PEN_COLORS, PEN_SIZES, POSES, RECESS, CRAFT_BASES, CRAFT_COLORS, CRAFT_PARTS, CLASSMATES } from './data.mjs';
import {
  G, V, button, hitArea, talk, talking, panel, hud, drawPunyu, drawCreature, text, emoji, rr, circ, ell, star,
  burst, floatText, showBanner, ease, clamp, lerp, inRect, drawSpeech, hash, heartPath,
} from './ui.mjs';
import { drawClassroom, drawDesk, drawSchoolyard, drawGym, drawKidArt, drawFramedPic, drawCraft, drawBase, drawPart } from './art.mjs';

export const LESSONS = {};
const PINK = { color: '#ff7aa8', ink: '#fff', shadow: '#d9507e' };

// ================= おえかき =================
LESSONS.draw = () => {
  G.sound.startBgm('school');
  const PW = 800, PH = 500;
  const paper = document.createElement('canvas'); paper.width = PW; paper.height = PH;
  const pc = paper.getContext('2d');
  pc.fillStyle = '#fff'; pc.fillRect(0, 0, PW, PH);
  const s = { phase: 'draw', color: PEN_COLORS[1], size: 1, tool: 'pen', stamp: 'star', strokes: 0, used: new Set(), stamps: 0, drawing: false, last: null, clearArm: 0, url: null };
  talk([
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
    hangPicture(G.save, s.url); G.persist();
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
    lines.push({ who: TEACHER, text: 'つぎは やすみじかん です。 みんなで あそんでね！' });
    setTimeout(() => talk(lines, () => G.go('period', { label: 'やすみじかん', name: 'あそぼう！', icon: '🏃', next: 'recess', clock: 10 })), 900);
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
      drawCreature(c, 'chapu', W * 0.86, gy + 70, 30, { t: G.T, mood: 'happy' });
      c.fillStyle = '#e8c88e'; ell(c, W * 0.86, gy + 82, 70, 18); c.fill();
      drawCreature(c, 'fuwari', W * 0.12, gy + 60, 30, { t: G.T, mood: 'happy' });
      drawCreature(c, 'kirara', W * 0.2, gy + 75, 30, { t: G.T + 1, mood: 'happy' });
      drawCreature(c, 'gorota', W * 0.72, gy + 64, 30, { t: G.T, mood: 'normal' });
      RECESS.forEach((rc, i) => {
        const x = W * (i ? 0.66 : 0.32), y = H - 70, r = 54;
        const hop = Math.max(0, Math.sin(G.T * 4 + i * 2)) * 10;
        c.fillStyle = 'rgba(255,255,255,.55)'; ell(c, x, y + 4, 90, 22); c.fill();
        drawCreature(c, rc.sp, x, y - hop, r, { t: G.T, mood: 'happy' });
        drawSpeech(c, x, y - 130, `${rc.invite}\n${rc.game === 'tag' ? '🏃' : '🪢'} ${rc.name}`, 24, { maxW: 280 });
        hitArea({ label: 'recess:' + rc.game, x: x - 100, y: y - 230, w: 200, h: 250 }, () => { if (talking()) return; G.sound.play('yay'); G.day.friend = rc.sp; G.go(rc.game); }, { instant: true });
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
    { who: 'punyu', text: 'あっ チャイムだ！ つぎは ダンス！' },
  ], () => G.go('period', { label: '2じかんめ', name: 'ダンス', icon: '💃', next: 'dance', clock: 10.75 })), 1200);
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

// ================= ダンス =================
const APPROACH = 1.7;
LESSONS.dance = () => {
  G.sound.startBgm('school');
  G.day.clock = 11;
  const s = { phase: 'intro', notes: [], perfect: 0, good: 0, combo: 0, maxCombo: 0, pose: -1, poseT: 9, judge: null, judgeT: 0, tries: 0, stars: 0, rate: 0, flash: [0, 0, 0, 0] };
  talk([
    { who: TEACHER, text: 'ダンスの じかん です！ みんなで おどろう♪' },
    { who: TEACHER, text: 'うえから ひかりが おりてくるよ。 ボタンに かさなったら おなじ ボタンを タッチ！' },
    { who: TEACHER, text: 'タッチすると ぷにゅが ポーズを するよ。 リズムに のってね！' },
  ], () => { s.phase = 'ready'; });
  const startSong = () => {
    s.notes = danceChart().map(n => ({ ...n, done: false, res: null }));
    s.perfect = 0; s.good = 0; s.combo = 0; s.maxCombo = 0; s.judge = null;
    s.tries++; s.phase = 'play';
    G.sound.startSong(0.8);
  };
  const tapLane = (lane) => {
    s.pose = lane; s.poseT = 0; s.flash[lane] = 1;
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
    G.sound.play(j);
  };
  const layout = () => {
    const lw = Math.min(110, (V.W - 420) / 4), x0 = V.W / 2 - lw * 2;
    return { lw, x0, top: 92, hitY: V.H - 96 };
  };
  const poseSt = (lane, t, base = {}) => {
    const k = clamp(1 - t / 0.45, 0, 1);
    if (lane === 0) return { ...base, sq: -0.14 * k, lift: 26 * k };
    if (lane === 1) return { ...base, rot: -0.38 * k, dx: -14 * k };
    if (lane === 2) return { ...base, rot: 0.38 * k, dx: 14 * k };
    if (lane === 3) return { ...base, rot: t < 0.45 ? (t / 0.45) * Math.PI * 2 : 0 };
    return base;
  };
  return {
    draw(c, dt) {
      const W = V.W, H = V.H, Lo = layout();
      const now = s.phase === 'play' ? G.sound.songTime() : -9;
      const beat = now / BEAT;
      drawGym(c, G.T);
      // ビートで ひかる
      if (s.phase === 'play' && now > 0) { const b = 1 - (beat % 1); c.fillStyle = `rgba(255,220,240,${b * 0.18})`; c.fillRect(0, 0, W, H); }
      if (s.phase === 'play') {
        for (const n of s.notes) if (!n.done && now - n.t > HIT.good) { n.done = true; n.res = 'miss'; s.combo = 0; s.judge = 'miss'; s.judgeT = 0.5; }
        const last = s.notes[s.notes.length - 1];
        if (now > last.t + 1.6) {
          s.phase = 'result'; G.sound.stopSong(); G.sound.startBgm('school');
          s.rate = danceRate(s.perfect, s.good, s.notes.length); s.stars = danceStars(s.rate);
          G.save.best.dance = Math.max(G.save.best.dance, s.stars); G.persist();
          if (s.stars > 0) {
            G.sound.play('fanfare'); burst(W / 2, H * 0.3, 'star', 24);
            G.day.results.dance = true; G.day.results.danceStars = Math.max(G.day.results.danceStars || 0, s.stars);
            s.got = G.award('dance', 1 + G.day.results.danceStars);
          }
        }
      }
      if (G.auto && s.phase === 'play') for (const n of s.notes) if (!n.done && Math.abs(now - n.t) < 0.03) tapLane(n.lane);
      s.poseT += dt; s.judgeT -= dt;
      // おどる みんな（おてほん：いまの おんぷの ポーズ）
      let demo = -1, demoT = 9;
      if (s.phase === 'play') for (const n of s.notes) { if (n.t <= now) { demo = n.lane; demoT = now - n.t; } else break; }
      const bounce = s.phase === 'play' && now > 0 ? Math.abs(Math.sin(beat * Math.PI)) * 8 : Math.abs(Math.sin(G.T * 3)) * 4;
      const side = Math.max(110, (Lo.x0 - 20) / 2);
      const rx0 = Lo.x0 + Lo.lw * 4 + 20;
      ['kirara', 'chapu', 'fuwari', 'gorota'].forEach((sp, i) => {
        const x = rx0 + (W - rx0) * (i % 2 ? 0.7 : 0.32), y = H * 0.5 + 60 + Math.floor(i / 2) * 140;
        const st = poseSt(demo, demoT, { t: G.T, mood: 'happy' });
        drawCreature(c, sp, x + (st.dx || 0), y - bounce - (st.lift || 0), 34, st);
      });
      {
        const x = Math.max(110, Lo.x0 / 2), y = H * 0.78;
        const st = poseSt(s.pose, s.poseT, { mood: s.judge === 'miss' && s.judgeT > 0 ? 'normal' : 'happy' });
        c.fillStyle = 'rgba(255,255,255,.35)'; ell(c, x, y + 6, 90, 20); c.fill();
        drawPunyu(c, x + (st.dx || 0), y - bounce - (st.lift || 0), 64, st);
        if (s.combo >= 5) text(c, `${s.combo} コンボ！`, x, y - 170, 30, { color: '#ff5d86', stroke: '#fff', sw: 8 });
      }
      // レーン
      for (let i = 0; i < 4; i++) {
        const x = Lo.x0 + i * Lo.lw;
        c.fillStyle = i % 2 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.32)';
        rr(c, x + 4, Lo.top, Lo.lw - 8, Lo.hitY - Lo.top + 40, 18); c.fill();
      }
      // おんぷ
      if (s.phase === 'play') for (const n of s.notes) {
        if (n.done) continue;
        const k = (n.t - now) / APPROACH;
        if (k > 1) break;
        const y = lerp(Lo.hitY, Lo.top, k), x = Lo.x0 + (n.lane + 0.5) * Lo.lw;
        c.fillStyle = POSES[n.lane].color; circ(c, x, y, Lo.lw * 0.36); c.fill();
        c.fillStyle = 'rgba(255,255,255,.85)'; circ(c, x, y, Lo.lw * 0.22); c.fill();
        poseIcon(c, n.lane, x, y, Lo.lw * 0.2, POSES[n.lane].color);
      }
      // ボタン
      for (let i = 0; i < 4; i++) {
        s.flash[i] = Math.max(0, s.flash[i] - dt * 4);
        const x = Lo.x0 + (i + 0.5) * Lo.lw, r = Lo.lw * 0.44;
        c.fillStyle = 'rgba(0,0,0,.15)'; circ(c, x, Lo.hitY + 6, r); c.fill();
        c.fillStyle = '#fff'; circ(c, x, Lo.hitY, r); c.fill();
        c.strokeStyle = POSES[i].color; c.lineWidth = 8 + s.flash[i] * 6; circ(c, x, Lo.hitY, r - 4); c.stroke();
        poseIcon(c, i, x, Lo.hitY - 6, r * 0.42, POSES[i].color);
        text(c, POSES[i].name, x, Lo.hitY + r * 0.55, 15, { color: POSES[i].color });
        if (s.phase === 'play' || s.phase === 'ready') hitArea({ x: x - Lo.lw / 2, y: Lo.hitY - Lo.lw * 0.7, w: Lo.lw, h: Lo.lw * 1.5 }, () => tapLane(i), { instant: true });
      }
      if (s.judge && s.judgeT > 0) {
        const lab = { perfect: 'かんぺき！', good: 'いいね！', miss: 'おしい' }[s.judge];
        text(c, lab, W / 2, Lo.hitY - 150 - (0.6 - s.judgeT) * 30, 40, { color: s.judge === 'perfect' ? '#ff5d86' : s.judge === 'good' ? '#ff9f43' : '#8a8fb5', stroke: '#fff', sw: 9 });
      }
      // カウント
      if (s.phase === 'play' && now < COUNT_IN * BEAT && now > -0.5) {
        const n = Math.floor(now / BEAT);
        text(c, n < 0 ? '' : ['1', '2', '3', 'スタート！'][n] || '', W / 2, H * 0.32, 72, { color: '#ff5d86', stroke: '#fff', sw: 14 });
      }
      // しんこう
      if (s.phase === 'play') {
        const tot = s.notes[s.notes.length - 1].t + 1, k = clamp(now / tot, 0, 1);
        c.fillStyle = 'rgba(255,255,255,.7)'; rr(c, W / 2 - 150, 66, 300, 14, 7); c.fill();
        c.fillStyle = '#ff7aa8'; rr(c, W / 2 - 150, 66, 300 * k, 14, 7); c.fill();
      }
      if (s.phase === 'ready' && !talking()) {
        panel(c, W / 2 - 200, H * 0.2, 400, 150);
        text(c, 'ボタンを おすと ポーズ！', W / 2, H * 0.2 + 40, 26);
        text(c, 'ためしに おしてみてね', W / 2, H * 0.2 + 76, 22, { color: '#a07ad0' });
        button(c, { x: W / 2 - 120, y: H * 0.2 + 96, w: 240, h: 66 }, 'スタート！', startSong, { ...PINK, size: 30, pulse: true });
      }
      if (s.phase === 'result') drawDanceResult(c, s, startSong);
      hud(c, '2じかんめ ダンス');
    },
  };
};
function poseIcon(c, lane, x, y, s, color) {
  c.save(); c.translate(x, y); c.fillStyle = color; c.strokeStyle = color; c.lineWidth = s * 0.38; c.lineCap = 'round'; c.lineJoin = 'round';
  const arrow = (rot) => { c.save(); c.rotate(rot); c.beginPath(); c.moveTo(0, s); c.lineTo(0, -s * 0.6); c.stroke(); c.beginPath(); c.moveTo(-s * 0.7, -s * 0.1); c.lineTo(0, -s); c.lineTo(s * 0.7, -s * 0.1); c.stroke(); c.restore(); };
  if (lane === 0) arrow(0);
  else if (lane === 1) arrow(-Math.PI / 2);
  else if (lane === 2) arrow(Math.PI / 2);
  else { c.beginPath(); c.arc(0, 0, s * 0.8, -Math.PI * 0.2, Math.PI * 1.35); c.stroke(); c.beginPath(); c.moveTo(s * 0.95, -s * 0.85); c.lineTo(s * 0.7, -s * 0.15); c.lineTo(s * 0.05, -s * 0.45); c.stroke(); }
  c.restore();
}
function drawDanceResult(c, s, again) {
  const W = V.W, H = V.H, w = 460, h = 330, x = W / 2 - w / 2, y = H * 0.16;
  panel(c, x, y, w, h);
  text(c, s.stars ? 'ダンス だいせいこう！' : 'おしい！', W / 2, y + 44, 36, { color: '#ff5d86' });
  for (let i = 0; i < 3; i++) {
    const on = i < s.stars;
    c.fillStyle = on ? '#ffd84a' : '#eee2ea'; c.strokeStyle = on ? '#ffb21e' : '#ddd'; c.lineWidth = 4;
    star(c, W / 2 + (i - 1) * 80, y + 112, 34); c.fill(); c.stroke();
  }
  text(c, `かんぺき ${s.perfect}   いいね ${s.good}`, W / 2, y + 170, 24);
  if (s.got) text(c, `シールを ${s.got}まい もらったよ！`, W / 2, y + 204, 22, { color: '#e08a00' });
  else if (!s.stars) text(c, 'ひかりが ボタンに かさなったら タッチ！', W / 2, y + 204, 20, { color: '#a07ad0' });
  const canNext = s.stars > 0 || s.tries >= 2;
  const bw = canNext ? 190 : 240;
  button(c, { x: canNext ? W / 2 - bw - 10 : W / 2 - bw / 2, y: y + h - 92, w: bw, h: 68 }, 'もういちど', again, { size: 28 });
  if (canNext) button(c, { x: W / 2 + 10, y: y + h - 92, w: bw, h: 68 }, 'つぎへ', () => {
    if (!G.day.results.dance) { G.day.results.dance = true; G.day.results.danceStars = 0; G.award('dance', 1); }
    talk([{ who: TEACHER, text: 'みんな じょうずに おどれました！ つぎは おまちかねの…' }, { text: 'みんな「きゅうしょく〜！」' }],
      () => G.go('period', { label: 'おひる', name: 'きゅうしょく', icon: '🍛', next: 'lunch', clock: 12 }));
  }, { ...PINK, size: 28, pulse: true });
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
      { who: TEACHER, text: 'これで きょうの じゅぎょうは おしまい！' },
    ], () => G.go('classBye')), 900);
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
