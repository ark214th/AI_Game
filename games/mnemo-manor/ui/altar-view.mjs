// 祭壇の部屋（遅延想起）。館を心の中でたどって「次の品」を選ぶ。
// 記憶の灯を使うと、その品を置いた部屋を少しだけ覗ける（報酬は減る）。

import { ITEM_BY_ID } from '../content/items.mjs';
import { ROOMS, FURNITURE } from '../content/palace.mjs';
import { sceneText } from '../core/palace/palace.mjs';
import { renderRoom, playScene } from './room.mjs';
import { drawChest } from '../render/sprites.mjs';

export function createAltarView(root, { onChoose, onLamp, onNext }) {
  root.innerHTML = `
    <div class="altar-box">
      <div class="altar-head"><span class="altar-flame">🕯️</span><div><small>祭壇</small><h3 class="altar-q"></h3></div><span class="altar-flame">🕯️</span></div>
      <div class="altar-dots"></div>
      <div class="cands"></div>
      <button class="lamp-btn"></button>
      <div class="reveal" hidden>
        <h3 class="reveal-title"></h3>
        <div class="reveal-scene"><span class="rv-furn"></span><span class="rv-item"></span></div>
        <p class="reveal-where"></p>
        <p class="reveal-text"></p>
        <button class="primary next-btn">先へ進む</button>
      </div>
    </div>
    <div class="peek" hidden><div class="peek-room"></div><div class="peek-bar"><i></i></div></div>`;
  const q = (s) => root.querySelector(s);
  let st = null;

  function dots(run, cur) {
    q('.altar-dots').innerHTML = run.items.map((_, k) => {
      const c = run.collected[k];
      const cls = k === cur ? 'cur' : c === true ? 'ok' : c === false ? 'ng' : '';
      return `<i class="${cls}">${c === true ? '✓' : c === false ? '✕' : k + 1}</i>`;
    }).join('');
  }

  function show({ run, index, candidates, allLoci }) {
    st = { run, index, candidates, allLoci, answered: false, lamp: false };
    q('.altar-q').textContent = `${index + 1}品目は？`;
    dots(run, index);
    const cands = q('.cands');
    cands.innerHTML = '';
    candidates.forEach((id) => {
      const it = ITEM_BY_ID[id];
      const b = document.createElement('button');
      b.className = 'cand';
      b.dataset.id = id;
      b.innerHTML = `<span class="c-emoji">${it.emoji}</span><span class="c-name">${it.name}</span>`;
      b.addEventListener('click', () => choose(id, b));
      cands.appendChild(b);
    });
    updateLamp();
    q('.reveal').hidden = true;
    q('.cands').hidden = false;
    root.hidden = false;
  }

  function updateLamp() {
    const b = q('.lamp-btn');
    const n = st.run.lamps;
    b.hidden = st.lamp;
    b.disabled = n <= 0;
    b.innerHTML = n > 0 ? `🕯️ 記憶の灯を使う <small>のこり ${n}・この品のお礼は半分</small>` : '🕯️ 記憶の灯は もうない';
  }

  function choose(id, btn) {
    if (!st || st.answered) return;
    st.answered = true;
    btn.classList.add('picked');
    onChoose(id, { lamp: st.lamp });
  }

  // 答え合わせ：館のどこで、どんな場面だったかをもう一度見せる
  function reveal({ ok, run, index, chosenId }) {
    const it = run.items[index];
    const item = ITEM_BY_ID[it.id];
    const locus = run.loci[index];
    const f = FURNITURE[locus.furn];
    q('.cands').querySelectorAll('.cand').forEach((b) => {
      if (b.dataset.id === it.id) b.classList.add('right');
      else if (b.dataset.id === chosenId) {
        b.classList.add('mimic');
        const c = document.createElement('canvas');
        c.width = c.height = 120;
        const g = c.getContext('2d');
        g.translate(60, 64);
        drawChest(g, 100, true);
        b.querySelector('.c-emoji').replaceWith(c);
      }
    });
    dots({ ...run }, -1);
    setTimeout(() => {
      if (!st) return;
      q('.cands').hidden = true;
      q('.lamp-btn').hidden = true;
      const rv = q('.reveal');
      rv.className = `reveal ${ok ? 'ok' : 'ng'}`;
      q('.reveal-title').textContent = ok ? '思い出した！' : 'ミミックだ！ 油を食われた';
      q('.rv-furn').textContent = f.emoji;
      const ri = q('.rv-item');
      ri.textContent = item.emoji;
      ri.className = 'rv-item';
      void ri.offsetWidth;
      ri.classList.add('m-' + f.reactions[it.reaction % f.reactions.length].motion);
      q('.reveal-where').textContent = `${index + 1}品目 ─ ${ROOMS[locus.room].name}の${f.name}`;
      q('.reveal-text').textContent = `${item.emoji} ${sceneText(item.name, locus.furn, it.reaction)}`;
      rv.hidden = false;
    }, ok ? 450 : 900);
  }

  // 記憶の灯：その品を置いた部屋を少しだけ覗く
  function peek(ms) {
    if (!st || st.lamp || st.answered) return;
    st.lamp = true;
    updateLamp();
    const locus = st.run.loci[st.index];
    const placed = {};
    st.run.items.forEach((it, k) => { placed[k] = { id: it.id, reaction: it.reaction }; });
    const pk = q('.peek');
    renderRoom(q('.peek-room'), { roomIndex: locus.room, loci: st.allLoci.filter((l) => l.room === locus.room), placed, used: st.run.items.length });
    const bar = q('.peek-bar i');
    bar.style.transition = 'none';
    bar.style.transform = 'scaleX(1)';
    pk.hidden = false;
    requestAnimationFrame(() => { bar.style.transition = `transform ${ms}ms linear`; bar.style.transform = 'scaleX(0)'; });
    setTimeout(() => { pk.hidden = true; }, ms);
  }

  q('.lamp-btn').onclick = () => { if (st && !st.lamp && st.run.lamps > 0 && !st.answered) onLamp(); };
  q('.next-btn').onclick = () => { if (st) { st = null; onNext(); } };

  return {
    show, reveal, peek,
    setRun(run) { if (st) { st.run = run; updateLamp(); } },
    hide() { st = null; root.hidden = true; q('.peek').hidden = true; },
    get open() { return !!st; },
  };
}
