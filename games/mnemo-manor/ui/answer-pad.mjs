// 閃光の回答：中央に紋章ボタン（2×2）、そのまわりに8方向のボタン。
// 閃光と同じ配置にして、「見えた場所」をそのまま押せるようにする。

import { EMBLEMS, EMBLEM_LABELS, DIR_COUNT, DIR_LABELS, dirAngle } from '../core/flash/flash.mjs';
import { drawEmblem } from '../render/sprites.mjs';

// キーボード：1〜4 で紋章、Q W E / A D / Z X C（またはテンキー）で方向
const DIR_KEYS = { KeyW: 0, KeyE: 1, KeyD: 2, KeyC: 3, KeyX: 4, KeyZ: 5, KeyA: 6, KeyQ: 7,
  Numpad8: 0, Numpad9: 1, Numpad6: 2, Numpad3: 3, Numpad2: 4, Numpad1: 5, Numpad4: 6, Numpad7: 7,
  ArrowUp: 0, ArrowRight: 2, ArrowDown: 4, ArrowLeft: 6 };
const EMBLEM_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };

export function createAnswerPad(root, view, { onSubmit, onTap }) {
  const embBtns = EMBLEMS.map((k, i) => {
    const b = document.createElement('button');
    b.className = 'emb';
    b.setAttribute('aria-label', EMBLEM_LABELS[k]);
    const c = document.createElement('canvas');
    b.appendChild(c);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); pick('emblem', i); });
    root.appendChild(b);
    return { b, c, kind: k };
  });
  const dirBtns = [...Array(DIR_COUNT).keys()].map((i) => {
    const b = document.createElement('button');
    b.className = 'dir';
    b.setAttribute('aria-label', DIR_LABELS[i]);
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${(dirAngle(i) * 180) / Math.PI + 90}deg)"><path d="M12 2 21 12h-6v10H9V12H3z"/></svg>`;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); pick('dir', i); });
    root.appendChild(b);
    return b;
  });

  let stage = 1;
  let open = false;
  let answer = { emblem: null, dir: null };

  function layout() {
    const { cx, cy, R } = view.layout;
    const B = Math.round(Math.max(54, Math.min(86, R * 0.2)));
    const gap = 8;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    embBtns.forEach(({ b, c, kind }, i) => {
      const col = i % 2, row = (i / 2) | 0;
      b.style.width = b.style.height = B + 'px';
      b.style.left = cx + (col ? gap / 2 : -gap / 2 - B) + 'px';
      b.style.top = cy + (row ? gap / 2 : -gap / 2 - B) + 'px';
      const s = B * 0.72;
      c.width = c.height = Math.round(s * dpr);
      c.style.width = c.style.height = s + 'px';
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, s, s);
      g.translate(s / 2, s / 2);
      drawEmblem(g, kind, s * 0.9);
    });
    const D = Math.round(Math.max(52, Math.min(80, R * 0.19)));
    const rr = Math.min(R * 0.95, Math.max(R * 0.66, B * 1.45 + gap + D * 0.75));
    dirBtns.forEach((b, i) => {
      const a = dirAngle(i);
      b.style.width = b.style.height = D + 'px';
      b.style.left = cx + Math.cos(a) * rr - D / 2 + 'px';
      b.style.top = cy + Math.sin(a) * rr - D / 2 + 'px';
    });
  }

  function refresh() {
    embBtns.forEach(({ b }, i) => b.classList.toggle('on', answer.emblem === i));
    dirBtns.forEach((b, i) => {
      b.hidden = stage < 2;
      b.classList.toggle('on', answer.dir === i);
    });
  }

  function pick(kind, i) {
    if (!open) return;
    answer = { ...answer, [kind]: i };
    onTap && onTap();
    refresh();
    if (answer.emblem != null && (stage < 2 || answer.dir != null)) {
      open = false;
      const a = answer;
      setTimeout(() => onSubmit(a), 90); // 押した色を一瞬見せてから判定
    }
  }

  function show(st) {
    stage = st;
    answer = { emblem: null, dir: null };
    open = true;
    layout();
    refresh();
    root.hidden = false;
  }

  function hide() {
    open = false;
    root.hidden = true;
  }

  function handleKey(e) {
    if (!open) return false;
    if (e.code in EMBLEM_KEYS) { pick('emblem', EMBLEM_KEYS[e.code]); return true; }
    if (stage >= 2 && e.code in DIR_KEYS) { pick('dir', DIR_KEYS[e.code]); return true; }
    return false;
  }

  window.addEventListener('resize', () => { if (!root.hidden) layout(); });

  return { show, hide, layout, handleKey, get open() { return open; } };
}
