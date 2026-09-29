// 館の1部屋（DOM）。収納・記憶の灯・祭壇の答え合わせで共通に使う。

import { ROOMS, FURNITURE } from '../content/palace.mjs';
import { ITEM_BY_ID } from '../content/items.mjs';
import { reactionOf } from '../core/palace/palace.mjs';

// loci: その部屋の置き場（routeLoci の要素）。placed: locusIndex → { id, reaction }
export function renderRoom(el, { roomIndex, loci, placed = {}, used = null, next = -1, onTap = null }) {
  const room = ROOMS[roomIndex];
  el.className = 'room';
  el.style.setProperty('--floor', room.floor);
  el.style.setProperty('--wall', room.wall);
  el.innerHTML = '';
  const name = document.createElement('div');
  name.className = 'room-title';
  name.textContent = room.name;
  el.appendChild(name);
  for (const l of loci) {
    const f = FURNITURE[l.furn];
    const d = document.createElement('div');
    d.className = 'locus';
    d.dataset.locus = l.index;
    d.style.left = l.pos[0] + '%';
    d.style.top = l.pos[1] + '%';
    const unused = used != null && l.index >= used;
    if (unused) d.classList.add('unused');
    if (l.index === next) d.classList.add('next');
    d.innerHTML = `<span class="furn">${f.emoji}</span><span class="num">${unused ? '' : l.index + 1}</span><span class="fname">${f.name}</span><span class="item"></span><span class="fx"></span>`;
    const p = placed[l.index];
    if (p) d.querySelector('.item').textContent = ITEM_BY_ID[p.id].emoji;
    if (onTap) d.addEventListener('pointerup', (e) => { e.preventDefault(); onTap(l.index, d); });
    el.appendChild(d);
  }
  return el;
}

// 置いた瞬間の相互作用アニメーション（品物の性質 × 家具の反応）
export function playScene(locusEl, itemId, furnId, reactionIndex) {
  const r = reactionOf(furnId, reactionIndex);
  const item = locusEl.querySelector('.item');
  item.textContent = ITEM_BY_ID[itemId].emoji;
  item.className = 'item';
  void item.offsetWidth;
  item.classList.add('m-' + r.motion);
  const fx = locusEl.querySelector('.fx');
  fx.innerHTML = '';
  for (let k = 0; k < 6; k++) {
    const s = document.createElement('i');
    s.textContent = r.fx;
    const a = (k / 6) * Math.PI * 2 + Math.random() * 0.6;
    s.style.setProperty('--dx', Math.cos(a) * (40 + Math.random() * 30) + 'px');
    s.style.setProperty('--dy', Math.sin(a) * (40 + Math.random() * 30) - 20 + 'px');
    s.style.animationDelay = k * 0.05 + 's';
    fx.appendChild(s);
  }
  locusEl.classList.remove('next');
  locusEl.classList.add('filled');
}
