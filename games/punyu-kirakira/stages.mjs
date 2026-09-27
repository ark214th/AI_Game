// ステージの地形とアイテム配置
import { Builder } from './core.mjs';

// ワールド1「おはなの のはら」— 試作ステージ
function nohara1() {
  const b = new Builder(0);
  // はじまりの道：歩くだけで星が取れる
  b.flat(22); // -6 … 16
  b.add('sign', 2.5, 0, { icon: 'right' });
  b.stars(5, 0.9, 5, 1.2);
  // 小さな段差
  b.add('sign', 12, 0, { icon: 'jump' });
  b.step(1).flat(8); // 16 … 24 (高さ1)
  b.stars(13.8, 1.5, 4, 0.9, 0.8);
  b.stars(18, 0.9, 4, 1.2);
  b.step(-1).flat(16); // 24 … 40
  // 最初のいたずらっ子：踏むと逃げていく
  b.add('enemy', 36, 0, { x0: 31, x1: 38 });
  b.stars(31.5, 2.6, 5, 1.1);
  // 最初の穴（狭い）
  b.gap(2.2); // 40 … 42.2
  b.stars(38.6, 1.3, 5, 1.2, 1.6);
  b.flat(9); // 42.2 … 51.2
  b.add('checkpoint', 46);
  // ゆるい下り坂と上り坂
  b.slope(10, -2).flat(4); // 51.2 … 61.2 … 65.2
  b.stars(52.5, 0.8, 8, 1.2);
  b.slope(8, 2).flat(12); // 65.2 … 73.2 … 85.2
  b.stars(66, 0.8, 5, 1.4);
  // ばねで高い足場へ。上にメダル1
  b.add('sign', 74.2, 0, { icon: 'up' });
  b.add('spring', 76);
  b.stars(76.4, 2.2, 1); b.stars(76.8, 3.4, 1); b.stars(77.4, 4.6, 1);
  b.platform(78, 5.4, 7.5);
  b.stars(79, 6.2, 3, 1);
  b.add('medal', 84, 6.5);
  b.flat(18); // 85.2 … 103.2
  // 浮いている足場（下から通り抜けられる）
  b.platform(89.5, 1.9, 3);
  b.platform(94.5, 3.5, 3);
  b.stars(90, 2.8, 3, 1);
  b.stars(95, 4.4, 3, 1);
  // ダッシュパネルで一気に走る（この先しばらく危険なし）
  b.add('dash', 101);
  b.flat(26); // 103.2 … 129.2
  b.stars(104, 0.8, 16, 1.6);
  b.slope(8, -1.5).flat(8); // 129.2 … 137.2 … 145.2 (高さ -1.5)
  b.stars(130, 0.8, 5, 1.4);
  b.add('checkpoint', 140);
  b.flat(14); // 145.2 … 159.2
  b.add('enemy', 149, 0, { x0: 146.5, x1: 152 });
  b.add('enemy', 156, 0, { x0: 154, x1: 158.5 });
  b.stars(147, 2.6, 4, 1.2); b.stars(154.5, 2.6, 4, 1.2);
  b.step(1.2).flat(6); // 159.2 … 165.2 (高さ -0.3)
  b.gap(2.5); // 165.2 … 167.7
  b.stars(163.8, 1.3, 5, 1.2, 1.8);
  b.flat(12); // 167.7 … 179.7
  // ばねの真上にメダル2
  b.add('spring', 171.5);
  b.stars(172.2, 2.5, 1); b.stars(172.9, 4.0, 1); b.stars(173.6, 5.4, 1);
  b.add('medal', 174.8, 6.6);
  // でこぼこの丘
  b.slope(5, 1).slope(5, -1).slope(5, 1).slope(5, -1); // 179.7 … 199.7
  b.stars(183.5, 1.2, 3, 1.2); b.stars(193.5, 1.2, 3, 1.2);
  b.flat(8); // 199.7 … 207.7
  b.add('checkpoint', 202);
  // 高い崖はばねで登る
  b.add('sign', 204, 0, { icon: 'up' });
  b.add('spring', 206.2);
  b.step(3.2).flat(10); // 207.7 … 217.7 (高さ 2.9)
  b.stars(209.5, 0.9, 3, 1);
  // 長い下り坂でびゅーん
  b.slope(14, -3.4); // 217.7 … 231.7 (高さ -0.5)
  b.stars(218.5, 0.8, 9, 1.5);
  b.flat(28); // 231.7 … 259.7
  b.add('dash', 234);
  b.stars(236, 0.8, 10, 1.8);
  b.add('enemy', 256, 0, { x0: 254, x1: 258.5 });
  // 小さな丘の上の足場にメダル3
  b.slope(4, 1.2).flat(3).slope(4, -1.2); // 259.7 … 263.7 … 266.7 … 270.7 (頂上 0.7)
  b.platform(264, 2.2, 2.4, 265);
  b.add('medal', 265.2, 1.1, { onPlat: true });
  b.stars(261, 1.4, 3, 1);
  b.flat(22); // 270.7 … 292.7
  b.stars(273, 0.9, 6, 1.3);
  b.add('goal', 285, 1.3);
  return b.finish({ id: '1-1', world: 1, name: 'おはなの のはら', theme: 'nohara' });
}

export const STAGES = [nohara1()];
export const STAGE_SLOTS = [
  { id: '1-1', name: 'おはなの のはら 1', ready: true },
  { id: '1-2', name: 'おはなの のはら 2', ready: false },
  { id: '1-3', name: 'おはなの のはら 3', ready: false },
];
