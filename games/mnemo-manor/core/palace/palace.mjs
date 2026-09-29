// 館の道順と置き場。道順と置き場の順番は固定（場所法の「順番どおりに思い出せる」性質のもと）。

import { ROOMS, FURNITURE } from '../../content/palace.mjs';

export const MAX_ROOMS = ROOMS.length;

// 道順どおりに並べた置き場の一覧
export function routeLoci(roomCount) {
  const out = [];
  ROOMS.slice(0, Math.max(1, Math.min(MAX_ROOMS, roomCount))).forEach((room, r) => {
    room.furn.forEach((furn, slot) => {
      out.push({ index: out.length, room: r, roomId: room.id, furn, slot, pos: room.layout[slot] });
    });
  });
  return out;
}

export function capacity(roomCount) {
  return routeLoci(roomCount).length;
}

export function reactionOf(furnId, reactionIndex) {
  const f = FURNITURE[furnId];
  return f.reactions[reactionIndex % f.reactions.length];
}

// 「{品物}が{家具}{反応}」の一文
export function sceneText(itemName, furnId, reactionIndex) {
  return `${itemName}が${FURNITURE[furnId].name}${reactionOf(furnId, reactionIndex).t}`;
}
