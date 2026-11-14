// カットシーン：1まい ずつ の「こましばい」。タッチで つぎへ すすむ
import { W, H } from './data.mjs';
import * as D from './draw.mjs';

const ease = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const bob = (t, sp = 3, amp = 6) => Math.sin(t * sp) * amp;
export const worldBg = (c, id, t) => (id === 'star' ? D.bgSky(c, t) : id === 'hero' ? D.bgField(c, t) : id === 'idol' ? D.bgStage(c, t) : D.bgGlitch(c, t));

function flash(c, t, dur = 0.5) { if (t < dur) { c.fillStyle = `rgba(255,255,255,${1 - t / dur})`; c.fillRect(0, 0, W, H); } }
function sparkles(c, x, y, t, n = 10, rad = 120) {
  for (let i = 0; i < n; i++) { const a = i * D.TAU / n + t, r = rad * (0.6 + 0.4 * Math.sin(t * 3 + i)); c.fillStyle = [D.COL.gold, '#fff', D.COL.pink][i % 3]; D.star(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 8 + 4 * Math.sin(t * 5 + i), t * 2 + i); c.fill(); }
}
function room(c, t, screen) { D.bgRoom(c, t); D.drawConsole(c, 640, 290, 1.15, t, screen); }
function friends(c, t) {
  D.drawLuna(c, 170, 250 + bob(t, 2.5), 50, { t, mood: 'happy' });
  D.drawComet(c, 330, 170 + bob(t + 1, 3), 38, t);
  D.drawSlime(c, 790, 290 + bob(t + 2, 4, 3), 52, { t, color: '#7fe08a', crown: true });
  D.drawStarKid(c, 650, 150 + bob(t + 3, 3), 26, t);
}

export const SCENES = {
  opening: () => [
    { text: 'あるひ ぷにゅは ふしぎな ゲームきを みつけたよ。', draw(c, t) { room(c, t, s => { s.fillStyle = '#241a4a'; s.fillRect(-128, -110, 256, 170); D.text(s, '？', 0, -25, 70, '#6ff09a'); }); D.drawPunyu(c, 120 + ease(t / 1.6) * 200, 352 - Math.abs(bob(t, 9, 10)), 62, { t, dir: 1 }); } },
    { text: '「うっしっし！ ぼくは バグバグ。 ゲームの せかいを めちゃくちゃに しちゃうぞ！」', sfx: 'laugh', draw(c, t) { room(c, t, s => D.screenNoise(s, t)); D.drawPunyu(c, 320, 352, 62, { t, dir: 1, mouth: 'o' }); const k = ease(t / 0.5); D.drawBug(c, 640 - k * 60, 250 - k * 110 + bob(t, 6, 6), 30 + k * 40, { t }); } },
    { text: 'たいへん！ ゲームの せかいが まぜこぜに なっちゃった。', sfx: 'glitch', draw(c, t) { room(c, t, s => { D.screenNoise(s, t, 3); }); D.drawPunyu(c, 320 + bob(t, 20, 3), 352, 62, { t, dir: 1, mouth: 'open' }); const k = ease(t / 0.6); D.drawBug(c, 580 + k * 60, 140 + k * 110, 70 - k * 60, { t }); } },
    { text: '「まって〜！」 ぷにゅも ゲームの なかへ すいこまれて…', sfx: 'warp', draw(c, t) { room(c, t, s => { D.screenNoise(s, t, 2); s.fillStyle = 'rgba(255,255,255,.5)'; s.beginPath(); s.arc(0, -25, 40 + 30 * Math.sin(t * 6), 0, D.TAU); s.fill(); }); const k = ease(t / 1.4), a = t * 7; D.drawPunyu(c, 320 + k * 320 + Math.cos(a) * 70 * (1 - k), 352 - k * 87 + Math.sin(a) * 60 * (1 - k), 62 - k * 50, { t, mouth: 'open', eyes: 'dizzy' }); } },
    { text: 'ここは ゲームの なか。 ゲームの せかいを たすけに いこう！', draw(c, t) { D.bgTunnel(c, t); D.drawPunyu(c, W / 2 + bob(t, 2, 60), 240 + bob(t, 3, 20), 70, { t, mouth: 'smile' }); } },
  ],

  enter: ({ world }) => {
    const name = world.title.join(' ').replace('☆', '');
    const line = { star: 'ほしの まほうつかいに へんしん！', hero: 'ゆうしゃに へんしん！', idol: 'アイドルに へんしん！', bug: 'ぜんぶの ふくで たたかうよ！' }[world.id];
    return [
      { text: `「${name}」の せかいへ…`, sfx: 'warp', draw(c, t) { D.bgTunnel(c, t, world.color2, '#140a2e'); D.drawPunyu(c, W / 2 + Math.cos(t * 4) * 90, 230 + Math.sin(t * 4) * 50, 60, { t, mouth: 'open' }); } },
      { text: line, sfx: 'henshin', draw(c, t) { worldBg(c, world.id, t); sparkles(c, W / 2, 250, t); const k = ease(t / 0.5); D.drawPunyu(c, W / 2, 260 - Math.abs(bob(t, 5, 12)), 60 + k * 30, { t, costume: world.id === 'bug' ? ['star', 'hero', 'idol'][Math.floor(t * 1.5) % 3] : world.costume, eyes: 'happy', mouth: 'open' }); flash(c, t); } },
    ];
  },

  bossStar: () => [
    { text: 'つきの ひめ ルナリアが バグバグに あやつられて いるみたい。', sfx: 'glitch', draw(c, t) { D.bgSky(c, t); D.drawLuna(c, W / 2, 190 + bob(t, 2), 70, { t, mood: 'bugged' }); D.drawPunyu(c, 200, 350, 50, { t, costume: 'star', dir: 1, mouth: 'o' }); } },
    { text: 'ワルツの たまを よけて、 めを さまして あげよう！', draw(c, t) { D.bgSky(c, t); D.drawLuna(c, 640, 200 + bob(t, 2), 60, { t, mood: 'bugged' }); D.drawPunyu(c, 300, 330 - Math.abs(bob(t, 6, 14)), 70, { t, costume: 'star', dir: 1, mouth: 'open' }); } },
  ],
  bossHero: () => [
    { text: 'たからの へやに でかスライム キングが いる！', sfx: 'thud', draw(c, t) { c.fillStyle = '#3a3350'; c.fillRect(0, 0, W, H); c.fillStyle = '#52486e'; c.fillRect(0, 380, W, 160); D.drawSlime(c, 620, 300 - Math.abs(bob(t, 4, 20)), 110, { t, color: '#7fe08a', crown: true }); D.drawPunyu(c, 220, 340, 52, { t, costume: 'hero', dir: 1, mouth: 'o' }); } },
    { text: '３かい とんだら めを まわすよ。 その ときが チャンス！', draw(c, t) { c.fillStyle = '#3a3350'; c.fillRect(0, 0, W, H); c.fillStyle = '#52486e'; c.fillRect(0, 380, W, 160); D.drawSlime(c, 620, 320, 110, { t, color: '#7fe08a', crown: true, dizzy: true }); D.drawPunyu(c, 380, 370, 62, { t, costume: 'hero', dir: 1, mouth: 'open', swing: (t * 1.5) % 1 }); } },
  ],
  bossIdol: () => [
    { text: 'さいごの ライブに ノイズが じゃまを しにきた！', sfx: 'glitch', draw(c, t) { D.bgStage(c, t); c.save(); c.translate(0, -160); D.screenNoise(c, t, 2); c.restore(); for (let i = 0; i < 5; i++) D.drawBug(c, 160 + i * 160, 110 + bob(t + i, 5, 10), 28, { t: t + i }); D.drawPunyu(c, W / 2, 360, 62, { t, costume: 'idol', mouth: 'o' }); } },
    { text: 'うたと ダンスで ノイズを ふきとばそう！', draw(c, t) { D.bgStage(c, t); sparkles(c, W / 2, 300, t, 8, 150); D.drawPunyu(c, W / 2, 320 - Math.abs(bob(t, 6, 18)), 76, { t, costume: 'idol', eyes: 'happy', mouth: 'open' }); } },
  ],

  clear: ({ world }) => {
    const line = { star: '「ありがとう、 ぷにゅ。 また いっしょに おどりましょう」', hero: '「まいった〜。 たからものは きみの ものだ」', idol: 'ライブは だいせいこう！ みんな にこにこ だよ。' }[world.id];
    return [
      { text: line, sfx: 'cheer', draw(c, t) {
        worldBg(c, world.id, t);
        if (world.id === 'star') D.drawLuna(c, 620, 220 + bob(t, 2), 66, { t, mood: 'happy' });
        if (world.id === 'hero') D.drawSlime(c, 640, 340, 90, { t, color: '#7fe08a', crown: true });
        if (world.id === 'idol') sparkles(c, W / 2, 280, t, 12, 220);
        D.drawPunyu(c, world.id === 'idol' ? W / 2 : 300, 350 - Math.abs(bob(t, 6, 16)), 72, { t, costume: world.costume, eyes: 'happy', mouth: 'open', dir: 1 });
      } },
      { text: 'ゲームの カセットが もとに もどったよ！', sfx: 'clear', draw(c, t) { D.bgTunnel(c, t * 0.4, world.color2, '#140a2e'); sparkles(c, W / 2, 230, t, 12, 170); c.save(); c.translate(W / 2, 230 + bob(t, 2, 8)); c.rotate(Math.sin(t * 2) * 0.08); D.drawCart(c, 0, 0, 220, 170, world); D.text(c, world.title[0], 0, -30, 24, '#fff', { stroke: 'rgba(0,0,0,.4)' }); D.text(c, world.title[1], 0, 2, 24, '#fff', { stroke: 'rgba(0,0,0,.4)' }); c.restore(); flash(c, t); } },
    ];
  },

  finalIntro: () => [
    { text: 'みっつの せかいが もとに もどった。 のこるは バグバグ だけ！', draw(c, t) { D.bgTunnel(c, t); D.drawPunyu(c, 300, 300, 70, { t, dir: 1 }); D.drawBug(c, 680, 230 + bob(t, 4, 10), 80, { t }); } },
    { text: '「むむむ… こうなったら ぜんぶ まぜこぜ だ！」', sfx: 'glitch', draw(c, t) { D.bgGlitch(c, t); D.drawBug(c, W / 2, 240 + bob(t, 14, 5), 120, { t }); } },
  ],

  ending: () => [
    { text: '「うわーん、 まけた〜。 ほんとうは だれかと あそびたかった だけなんだ…」', sfx: 'cry', draw(c, t) { D.bgTunnel(c, t * 0.3, '#8fd0ff', '#241a4a'); D.drawBug(c, 620, 300, 90, { t, mood: 'cry', glitch: 0 }); D.drawPunyu(c, 300, 320, 66, { t, dir: 1, mouth: 'o' }); } },
    { text: '「じゃあ いっしょに あそぼう！」 ぷにゅは にっこり わらったよ。', sfx: 'ok', draw(c, t) { D.bgTunnel(c, t * 0.3, '#ffd84a', '#3a2466'); c.fillStyle = '#ff6f9f'; D.heart(c, W / 2, 150 + bob(t, 3, 8), 30 + 4 * Math.sin(t * 6)); c.fill(); D.drawBug(c, 600, 300 - Math.abs(bob(t, 6, 10)), 90, { t, mood: 'happy', glitch: 0 }); D.drawPunyu(c, 360, 320, 66, { t, dir: 1, eyes: 'happy', mouth: 'open' }); } },
    { text: 'ゲームの せかいの みんなと ともだちに なったよ。', sfx: 'cheer', draw(c, t) { D.bgSky(c, t, { top: '#3a66d0', mid: '#8f7fe0', bot: '#ffb0d8' }); friends(c, t); D.drawBug(c, 600, 340 - Math.abs(bob(t, 5, 12)), 60, { t, mood: 'happy', glitch: 0 }); D.drawPunyu(c, 440, 340 - Math.abs(bob(t + 0.5, 5, 12)), 66, { t, eyes: 'happy', mouth: 'open' }); sparkles(c, W / 2, 300, t, 14, 330); } },
    { text: 'おしまい。 また あそぼうね！', sfx: 'clear', draw(c, t) { room(c, t, s => { s.fillStyle = '#ffb0d8'; s.fillRect(-128, -110, 256, 170); s.fillStyle = '#fff'; D.star(s, 0, -25, 44, t); s.fill(); }); D.drawPunyu(c, 300, 352 - Math.abs(bob(t, 5, 8)), 62, { t, dir: 1, eyes: 'happy', mouth: 'open' }); D.drawBug(c, 440, 362 - Math.abs(bob(t + 1, 5, 8)), 44, { t, mood: 'happy', glitch: 0 }); } },
  ],
};

// せりふの わく（した）と「とばす」の ばしょ
export function drawPage(c, page, t, pageIdx, total) {
  c.save(); page.draw(c, t); c.restore();
  const lines = D.wrap(c, page.text, 820, 27), h = 46 + lines.length * 38, y = H - h - 16;
  c.fillStyle = 'rgba(20,12,50,.82)'; D.rr(c, 40, y, W - 80, h, 22); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; D.rr(c, 40, y, W - 80, h, 22); c.stroke();
  // もじは すこしずつ でる
  let left = Math.floor(t * 34);
  lines.forEach((ln, i) => { const show = ln.slice(0, Math.max(0, left)); left -= ln.length; if (show) D.text(c, show, 72, y + 40 + i * 38, 27, '#fff', { align: 'left' }); });
  if (left > 0 && Math.sin(t * 6) > -0.2) D.text(c, '▼', W - 78, y + h - 24, 20, D.COL.gold);
  for (let i = 0; i < total; i++) { c.fillStyle = i === pageIdx ? '#fff' : 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(W / 2 + (i - (total - 1) / 2) * 18, y - 14, 5, 0, D.TAU); c.fill(); }
  return left > 0;   // ぜんぶ でた？
}
