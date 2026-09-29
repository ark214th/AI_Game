// 掲示板（依頼選び）、館の手入れ（メタ進行）、精算の画面。

import { ITEM_BY_ID } from '../content/items.mjs';
import { CLIENTS } from '../content/clients.mjs';
import { ROOMS } from '../content/palace.mjs';
import { REWARD, SHOP } from '../config/tuning.mjs';

const CLIENT_BY_ID = Object.fromEntries(CLIENTS.map((c) => [c.id, c]));

// ---------- 掲示板 ----------
export function createBoardView(root, { onStart, onBack }) {
  root.innerHTML = `
    <div class="board">
      <div class="board-head"><h2>依頼の掲示板</h2><p class="note">受けた依頼の品は、すべて館に置いて覚えてから潜る。欲張るほどお礼は増えるが、覚える量も増える。</p></div>
      <div class="board-cards"></div>
      <div class="board-foot">
        <div class="board-sum"></div>
        <div class="buttons"><button class="back-btn">もどる</button><button class="start-btn primary">館へ運ぶ</button></div>
      </div>
    </div>`;
  const q = (s) => root.querySelector(s);
  let st = null;

  function draw() {
    q('.board-cards').innerHTML = st.board.map((r, i) => {
      const c = CLIENT_BY_ID[r.client];
      const items = r.items.map((id) => `<li>${ITEM_BY_ID[id].emoji}<span>${ITEM_BY_ID[id].name}</span></li>`).join('');
      return `<button class="req-card ${st.sel.has(i) ? 'on' : ''}" data-i="${i}">
        <div class="rc-head"><span class="rc-icon">${c.icon}</span><span>${c.name}</span></div>
        <ul>${items}</ul>
        <div class="rc-reward">そろえたお礼 <b>${r.reward}</b> 枚<span class="rc-check">${st.sel.has(i) ? '受ける ✓' : ''}</span></div>
      </button>`;
    }).join('');
    q('.board-cards').querySelectorAll('.req-card').forEach((b) => (b.onclick = () => toggle(Number(b.dataset.i))));
    const n = count();
    const over = n > st.capacity;
    const multi = REWARD.multi[Math.min(REWARD.multi.length - 1, st.sel.size)];
    q('.board-sum').innerHTML = `
      <span class="${over ? 'bad' : ''}">覚える品 <b>${n}</b> ／ 館の置き場 ${st.capacity}</span>
      <span>いまの腕前のおすすめ：${st.recommended}品</span>
      ${st.sel.size >= 2 ? `<span class="good">同時に${st.sel.size}件：お礼 ×${multi}</span>` : ''}`;
    const sb = q('.start-btn');
    sb.disabled = n === 0 || over;
    sb.textContent = over ? '置き場が足りない' : '館へ運ぶ';
  }

  function count() {
    return [...st.sel].reduce((a, i) => a + st.board[i].items.length, 0);
  }

  function toggle(i) {
    if (st.sel.has(i)) st.sel.delete(i);
    else st.sel.add(i);
    draw();
  }

  q('.start-btn').onclick = () => {
    if (!st || count() === 0 || count() > st.capacity) return;
    onStart([...st.sel].sort((a, b) => a - b).map((i) => st.board[i]));
  };
  q('.back-btn').onclick = () => onBack();

  return {
    show({ board, capacity, recommended }) {
      st = { board, capacity, recommended, sel: new Set() };
      draw();
      root.hidden = false;
    },
    hide() { root.hidden = true; },
    // テスト用
    select(indices) { indices.forEach((i) => st.sel.add(i)); draw(); },
  };
}

// ---------- 館の手入れ ----------
export function createShopView(root, { onBuy, onBack }) {
  root.innerHTML = `
    <div class="panel shop">
      <h2>館の手入れ</h2>
      <p class="gold-line">金貨 <b class="gold"></b> 枚</p>
      <div class="palace-map"></div>
      <div class="shop-rows"></div>
      <p class="note">閃光の光を長くするような強化はありません。見抜く力は、潜るたびに少しずつ。</p>
      <div class="buttons"><button class="back-btn primary">もどる</button></div>
    </div>`;
  const q = (s) => root.querySelector(s);
  let meta = null;

  function draw() {
    q('.gold').textContent = meta.gold;
    q('.palace-map').innerHTML = ROOMS.map((r, i) => `<span class="${i < meta.rooms ? 'own' : ''}">${i < meta.rooms ? r.name : '？'}</span>`).join('<b>→</b>');
    const rows = [
      { kind: 'room', title: '新しい部屋', desc: meta.rooms < ROOMS.length ? `${ROOMS[meta.rooms].name}をひらく（置き場 +4）` : 'すべての部屋がひらいた', lv: meta.rooms - SHOP.startRooms, costs: SHOP.room },
      { kind: 'oil', title: '油壺', desc: 'ランタン油の最大 +1', lv: meta.oilUp, costs: SHOP.oil },
      { kind: 'lamp', title: '記憶の灯', desc: '潜るときに持っていける灯 +1', lv: meta.lampUp, costs: SHOP.lamp },
    ];
    q('.shop-rows').innerHTML = rows.map((r) => {
      const cost = r.costs[r.lv];
      const max = cost == null;
      return `<div class="shop-row"><div><b>${r.title}</b><small>${r.desc}</small></div>
        <button data-kind="${r.kind}" ${max || meta.gold < cost ? 'disabled' : ''}>${max ? '最大' : `${cost} 枚`}</button></div>`;
    }).join('');
    q('.shop-rows').querySelectorAll('button').forEach((b) => (b.onclick = () => onBuy(b.dataset.kind)));
  }

  q('.back-btn').onclick = () => onBack();
  return {
    show(m) { meta = m; draw(); root.hidden = false; },
    hide() { root.hidden = true; },
  };
}

export function shopCost(meta, kind) {
  if (kind === 'room') return SHOP.room[meta.rooms - SHOP.startRooms];
  if (kind === 'oil') return SHOP.oil[meta.oilUp];
  if (kind === 'lamp') return SHOP.lamp[meta.lampUp];
  return undefined;
}

// ---------- 精算 ----------
export function renderResult(root, { result, run, gold, recommended, prevRecommended }) {
  const reqs = result.reqs.map(({ request, indices, complete }) => {
    const c = CLIENT_BY_ID[request.client];
    const items = indices.map((k) => {
      const it = ITEM_BY_ID[run.items[k].id];
      const s = run.collected[k];
      return `<li class="${s === true ? 'ok' : s === false ? 'ng' : 'none'}">${it.emoji}<i>${s === true ? (run.lampUsed[k] ? '🕯️' : '✓') : s === false ? '✕' : '…'}</i></li>`;
    }).join('');
    return `<div class="res-req ${complete ? 'complete' : ''}"><div>${c.icon} ${c.name}${complete ? '<span class="stamp">達成</span>' : ''}</div><ul>${items}</ul></div>`;
  }).join('');
  const lines = [
    ['思い出した品', `${result.itemCoins}`],
    ['依頼のお礼', `${result.bonusCoins}`],
    ['閃光で見つけた宝', `${result.flashCoins}`],
  ];
  root.querySelector('.res-reason').textContent = run.endReason === 'oil' ? 'ランタン油が尽きた' : 'すべての祭壇をめぐった';
  root.querySelector('.res-reqs').innerHTML = reqs;
  root.querySelector('.res-coins').innerHTML = lines.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')
    + (result.multi > 1 ? `<div><span>同時に受けた依頼</span><b>×${result.multi}</b></div>` : '')
    + `<div class="total"><span>今回の金貨</span><b>+${result.total}</b></div><div class="have"><span>もっている金貨</span><b>${gold}</b></div>`;
  let msg;
  if (result.correct === result.items) msg = 'ひとつ残らず思い出せた。';
  else if (result.correct === 0) msg = '館の場面が、まだ霧の中。変な場面ほど、よく残る。';
  else msg = `${result.items}品のうち ${result.correct}品を思い出せた。`;
  if (recommended > prevRecommended) msg += ` 次は ${recommended}品に挑めそう。`;
  else if (recommended < prevRecommended) msg += ` 次は ${recommended}品くらいで、場面づくりを楽しもう。`;
  root.querySelector('.res-msg').textContent = msg;
}
