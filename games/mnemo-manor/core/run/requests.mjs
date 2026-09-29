// 掲示板の依頼を作る。同じ掲示板の依頼どうしで品物は重ならない（祭壇で答えが一つに決まるように）。

import { ITEMS } from '../../content/items.mjs';
import { CLIENTS } from '../../content/clients.mjs';
import { BOARD, REWARD } from '../../config/tuning.mjs';

export function generateBoard(rng, { recommended = 5, count = BOARD.count } = {}) {
  const used = new Set();
  const clients = rng.shuffle(CLIENTS).slice(0, count);
  const sizes = [...BOARD.sizes];
  while (sizes.length < count) sizes.push(recommended >= BOARD.bigFrom ? 5 : BOARD.sizes[rng.int(BOARD.sizes.length)]);
  const order = rng.shuffle(sizes).slice(0, count);
  return clients.map((client, i) => {
    const n = order[i];
    const liked = rng.shuffle(ITEMS.filter((it) => client.cats.includes(it.cat) && !used.has(it.id)));
    const rest = rng.shuffle(ITEMS.filter((it) => !client.cats.includes(it.cat) && !used.has(it.id)));
    const items = [...liked, ...rest].slice(0, n).map((it) => it.id);
    items.forEach((id) => used.add(id));
    return { id: `${client.id}-${i}`, client: client.id, items, reward: REWARD.requestBonus(n) };
  });
}
