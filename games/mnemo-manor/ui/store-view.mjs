// 館への収納（場所法フェーズ）。品物を道順どおりに置き場へ運ぶと、家具と奇妙な相互作用をする。
// 置き終わったら館をひと回りして確かめ、依頼書を燃やして潜る。

import { ITEM_BY_ID } from '../content/items.mjs';
import { CLIENTS } from '../content/clients.mjs';
import { ROOMS } from '../content/palace.mjs';
import { sceneText } from '../core/palace/palace.mjs';
import { renderRoom, playScene } from './room.mjs';

const CLIENT_BY_ID = Object.fromEntries(CLIENTS.map((c) => [c.id, c]));
const SCENE_MS = 1250;

export function createStoreView(root, { onDone, onPlace, onTimeUp }) {
  root.innerHTML = `
    <div class="store-top">
      <div class="route"></div>
      <div class="hourglass" title="砂時計"><i></i></div>
    </div>
    <div class="store-main">
      <div class="store-stage">
        <div class="store-room"></div>
        <p class="caption"></p>
      </div>
      <div class="store-side">
        <div class="req-list"></div>
        <div class="hand"></div>
        <div class="store-actions" hidden>
          <div class="nav"><button class="prev" aria-label="前の部屋">◀</button><span class="nav-label"></span><button class="next" aria-label="次の部屋">▶</button></div>
          <button class="go primary">依頼書を燃やして潜る</button>
        </div>
      </div>
    </div>`;
  const q = (s) => root.querySelector(s);
  const roomEl = q('.store-room');
  const caption = q('.caption');
  const hand = q('.hand');
  const list = q('.req-list');
  const route = q('.route');
  const glass = q('.hourglass i');
  const actions = q('.store-actions');

  let st = null;

  function roomsUsed() {
    return [...new Set(st.run.loci.map((l) => l.room))];
  }

  function drawRoute() {
    route.innerHTML = roomsUsed().map((r) => `<span class="${r === st.room ? 'on' : ''}">${ROOMS[r].name}</span>`).join('<b>→</b>');
  }

  function drawRoom() {
    renderRoom(roomEl, {
      roomIndex: st.room,
      loci: st.allLoci.filter((l) => l.room === st.room),
      placed: st.placed,
      used: st.run.items.length,
      next: st.done ? -1 : st.p,
      onTap: onLocusTap,
    });
    drawRoute();
    q('.nav-label').textContent = ROOMS[st.room].name;
  }

  function drawList() {
    list.innerHTML = st.run.requests.map((r, ri) => {
      const c = CLIENT_BY_ID[r.client];
      const rows = st.run.items.map((it, k) => ({ it, k })).filter(({ it }) => it.req === ri).map(({ it, k }) => {
        const item = ITEM_BY_ID[it.id];
        return `<li class="${st.placed[k] ? 'done' : ''} ${k === st.p && !st.done ? 'cur' : ''}"><b>${k + 1}</b>${item.emoji} ${item.name}</li>`;
      }).join('');
      return `<div class="req"><div class="req-head">${c.icon} ${c.name}</div><ol>${rows}</ol></div>`;
    }).join('');
  }

  function drawHand() {
    if (st.done) {
      hand.innerHTML = `<p class="hand-done">すべて置いた。<br>館をひと回りして、場面を思い浮かべよう。<br><small>置き場をタップすると、もう一度見られる</small></p>`;
      return;
    }
    const it = st.run.items[st.p];
    const item = ITEM_BY_ID[it.id];
    hand.innerHTML = `<div class="hand-card" draggable="false"><span class="hand-emoji">${item.emoji}</span><span>${item.name}</span><small>光っている置き場へ運ぶ（タップでも置ける）</small></div>`;
    const card = hand.querySelector('.hand-card');
    card.addEventListener('pointerdown', (e) => startDrag(e, item.emoji));
  }

  // ---------- ドラッグ ----------
  let ghost = null;
  function startDrag(e, emoji) {
    if (st.busy || st.done) return;
    e.preventDefault();
    ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = emoji;
    document.body.appendChild(ghost);
    moveGhost(e);
    window.addEventListener('pointermove', moveGhost);
    window.addEventListener('pointerup', endDrag, { once: true });
  }
  function moveGhost(e) {
    if (ghost) ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }
  function endDrag(e) {
    window.removeEventListener('pointermove', moveGhost);
    if (ghost) { ghost.remove(); ghost = null; }
    if (!st || st.busy) return; // マウスでは置き場のタップとしても届くので、二重に置かない
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const l = under && under.closest('.locus');
    if (l && Number(l.dataset.locus) === st.p) place(l);
    else if (l || (under && under.closest('.store-room'))) nudge();
  }
  function nudge() {
    const n = roomEl.querySelector('.locus.next');
    if (n) { n.classList.remove('nudge'); void n.offsetWidth; n.classList.add('nudge'); }
  }

  function onLocusTap(idx, el) {
    if (!st || st.busy) return;
    if (!st.done) {
      if (idx === st.p) place(el);
      else nudge();
      return;
    }
    // ひと回り：タップでもう一度場面を見る
    const it = st.run.items[idx];
    if (!it) return;
    playScene(el, it.id, st.run.loci[idx].furn, it.reaction);
    showCaption(idx);
  }

  function showCaption(k) {
    const it = st.run.items[k];
    const item = ITEM_BY_ID[it.id];
    caption.innerHTML = `<b>${k + 1}</b> ${item.emoji} ${sceneText(item.name, st.run.loci[k].furn, it.reaction)}`;
    caption.classList.remove('pop'); void caption.offsetWidth; caption.classList.add('pop');
  }

  function place(el) {
    const k = st.p;
    const it = st.run.items[k];
    st.placed[k] = { id: it.id, reaction: it.reaction };
    playScene(el, it.id, st.run.loci[k].furn, it.reaction);
    showCaption(k);
    onPlace && onPlace(k);
    st.p++;
    st.busy = true;
    drawList();
    if (st.p >= st.run.items.length) {
      st.done = true;
      drawHand();
    } else {
      hand.querySelector('.hand-card')?.classList.add('gone');
    }
    setTimeout(() => {
      if (!st) return;
      st.busy = false;
      if (st.done) { actions.hidden = false; drawRoom(); return; }
      const nr = st.run.loci[st.p].room;
      if (nr !== st.room) {
        roomEl.classList.add('leave');
        setTimeout(() => { if (!st) return; st.room = nr; drawRoom(); roomEl.classList.add('enter'); setTimeout(() => roomEl.classList.remove('enter'), 350); }, 280);
      } else {
        roomEl.querySelector(`.locus[data-locus="${st.p}"]`)?.classList.add('next');
      }
      drawHand();
    }, SCENE_MS);
  }

  function nav(d) {
    const rs = roomsUsed();
    const i = rs.indexOf(st.room);
    st.room = rs[(i + d + rs.length) % rs.length];
    drawRoom();
  }

  function finish(timeUp) {
    if (!st || st.finished) return;
    st.finished = true;
    clearInterval(st.timer);
    const ratio = st.seconds ? Math.max(0, st.left / st.seconds) : 0;
    list.classList.add('burning');
    caption.innerHTML = timeUp ? '<b>⌛</b> 時間切れ！ 依頼書が燃えていく…' : '🔥 依頼書は燃えた。もう見られない。';
    setTimeout(() => { const r = st; st = null; onDone({ timeLeftRatio: ratio, placed: r.placed }); }, 1300);
  }

  function tick() {
    st.left = Math.max(0, st.seconds - (performance.now() - st.t0) / 1000);
    glass.style.transform = `scaleX(${st.left / st.seconds})`;
    glass.parentElement.classList.toggle('low', st.left < st.seconds * 0.2);
    if (st.left <= 0) {
      // 時間切れ：残りは乱暴に放りこまれる（場面は見られない）
      for (let k = st.p; k < st.run.items.length; k++) st.placed[k] = { id: st.run.items[k].id, reaction: st.run.items[k].reaction };
      st.p = st.run.items.length;
      st.done = true;
      onTimeUp && onTimeUp();
      finish(true);
    }
  }

  q('.prev').onclick = () => nav(-1);
  q('.next').onclick = () => nav(1);
  q('.go').onclick = () => finish(false);

  return {
    start({ run, allLoci, seconds }) {
      st = { run, allLoci, seconds, left: seconds, placed: {}, p: 0, done: false, busy: false, room: run.loci[0].room, t0: performance.now(), finished: false };
      list.classList.remove('burning');
      actions.hidden = true;
      caption.textContent = '品物を、道順どおりに置き場へ運ぼう。変な場面ほど、よく覚えられる。';
      glass.parentElement.hidden = seconds == null;
      glass.style.transform = 'scaleX(1)';
      if (seconds != null) st.timer = setInterval(tick, 100);
      drawRoom();
      drawList();
      drawHand();
      root.hidden = false;
    },
    hide() {
      if (st) clearInterval(st.timer);
      st = null;
      root.hidden = true;
    },
    // テスト用：次の置き場に置く
    placeNext() {
      if (!st || st.busy || st.done) return false;
      const el = roomEl.querySelector(`.locus[data-locus="${st.p}"]`);
      if (el) place(el);
      return !!el;
    },
    finish: () => finish(false),
    get state() { return st; },
  };
}
