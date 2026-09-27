// ステージの地形とアイテム配置
// 各ワールド3ステージ。3つめは短いコースのあとにボス。
// ワールドが進むごとに、新しいしかけを1〜2種類ずつ足し、穴や敵を少しずつ増やす。
import { Builder } from './core.mjs';

// ==================== ワールド1：おはなの のはら ====================
// 走る・跳ぶ・ばね・坂・ダッシュパネル
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
  b.add('enemy', 35, 0, { x0: 31, x1: 37.4 });
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
  b.slope(4, 1.2).flat(3).slope(4, -1.2); // 259.7 … 270.7 (頂上 0.7)
  b.platform(264, 2.2, 2.4, 265);
  b.add('medal', 265.2, 1.1, { onPlat: true });
  b.stars(261, 1.4, 3, 1);
  b.flat(22); // 270.7 … 292.7
  b.stars(273, 0.9, 6, 1.3);
  b.add('goal', 285, 1.3);
  return b.finish({ id: '1-1', world: 1, name: 'おはなの のはら 1', theme: 'nohara' });
}

// 1-2：穴と敵が少し増える。浮き足場の階段
function nohara2() {
  const b = new Builder(0);
  b.flat(20); // -6 … 14
  b.stars(3, 0.9, 6, 1.2);
  b.add('enemy', 9, 0, { x0: 6, x1: 11.4 });
  b.gap(2.4); // 14 … 16.4
  b.stars(12.6, 1.4, 5, 1.2, 1.6);
  b.flat(10); // 16.4 … 26.4
  b.step(1).flat(6); // 26.4 … 32.4 (高さ1)
  b.step(1).flat(6); // 32.4 … 38.4 (高さ2)
  b.stars(24.8, 1.6, 3, 0.8, 0.6); b.stars(30.8, 1.6, 3, 0.8, 0.6);
  b.slope(10, -2).flat(6); // 38.4 … 48.4 … 54.4
  b.stars(39, 0.8, 7, 1.4);
  b.add('checkpoint', 50);
  // 浮き足場の階段。てっぺんにメダル1
  b.flat(20); // 54.4 … 74.4
  b.platform(57, 1.8, 2.6); b.platform(61, 3.4, 2.6); b.platform(65, 5.0, 2.6);
  b.stars(57.4, 2.7, 2, 1); b.stars(61.4, 4.3, 2, 1);
  b.add('medal', 66.3, 6.1);
  b.add('enemy', 69, 0, { x0: 66, x1: 71.8 });
  b.gap(2.6); // 74.4 … 77
  b.stars(72.8, 1.4, 5, 1.2, 1.7);
  b.flat(8); // 77 … 85
  b.add('spring', 83);
  b.flat(16); // 85 … 101
  b.platform(84.6, 5.2, 7);
  b.stars(85.2, 6, 6, 1.1);
  b.add('enemy', 96, 0, { x0: 92, x1: 100 });
  b.flat(4); // 101 … 105
  b.add('dash', 102.5);
  b.flat(22); // 105 … 127
  b.stars(106, 0.8, 12, 1.7);
  b.slope(6, 1.5).flat(4); // 127 … 133 … 137 (高さ1.5)
  b.add('checkpoint', 134);
  b.gap(2.4); // 137 … 139.4
  b.stars(135.6, 1.4, 5, 1.2, 1.6);
  b.flat(6); // 139.4 … 145.4
  b.platform(140.5, 2.3, 3);
  b.add('medal', 142, 1.2, { onPlat: true });
  b.gap(2.4, -0.5); // 145.4 … 147.8 (高さ1)
  b.stars(143.8, 1.4, 5, 1.2, 1.6);
  b.flat(10); // 147.8 … 157.8
  b.add('enemy', 153, 0, { x0: 150.4, x1: 156.5 });
  b.stars(150, 2.6, 5, 1.2);
  b.slope(12, -3).flat(10); // 157.8 … 169.8 … 179.8 (高さ -2)
  b.stars(158.5, 0.8, 8, 1.4);
  b.add('checkpoint', 171);
  b.add('enemy', 177, 0, { x0: 174.5, x1: 179.5 });
  b.slope(4, 1).slope(4, -1).slope(4, 1).slope(4, -1); // 179.8 … 195.8
  b.stars(182.5, 1.2, 3, 1.2); b.stars(190.5, 1.2, 3, 1.2);
  b.flat(10); // 195.8 … 205.8
  b.add('spring', 199);
  b.platform(200.4, 6.2, 3);
  b.add('medal', 201.9, 1.1, { onPlat: true });
  b.stars(199.6, 2.5, 1); b.stars(200.2, 4, 1);
  b.flat(18); // 205.8 … 223.8
  b.stars(207, 0.9, 6, 1.3);
  b.add('goal', 216, 1.3);
  return b.finish({ id: '1-2', world: 1, name: 'おはなの のはら 2', theme: 'nohara' });
}

// 1-3：短い道のあと、ボス「でかもやもや」
function nohara3() {
  const b = new Builder(0);
  b.flat(16); // -6 … 10
  b.stars(3, 0.9, 5, 1.2);
  b.add('enemy', 6, 0, { x0: 4, x1: 7.4 });
  b.gap(2.2); // 10 … 12.2
  b.stars(8.8, 1.3, 4, 1.2, 1.4);
  b.flat(12); // 12.2 … 24.2
  b.platform(15, 2, 3);
  b.add('medal', 16.5, 1.1, { onPlat: true });
  b.step(1).flat(8); // 24.2 … 32.2 (高さ1)
  b.add('spring', 29.5);
  b.platform(30.8, 5.2, 4, 30);
  b.add('medal', 33.5, 1.1, { onPlat: true });
  b.stars(30, 2.5, 1); b.stars(30.5, 4, 1);
  b.flat(12); // 32.2 … 44.2
  b.add('checkpoint', 36);
  b.platform(38.5, 1.9, 2.4);
  b.add('medal', 39.7, 1.1, { onPlat: true });
  b.add('heart', 42, 1);
  b.add('sign', 43, 0, { icon: 'right' });
  b.flat(20); // 44.2 … 64.2 ボスのひろば
  b.add('boss', 45, 0, { x1: 63, type: 'blob', hp: 3 });
  b.flat(4); // 64.2 … 68.2
  return b.finish({ id: '1-3', world: 1, name: 'でかもやもや', theme: 'nohara', bossStage: true });
}

// ==================== ワールド2：おかしの もり ====================
// 動く足場（エレベーター・渡し舟）、ぴょんぴょんゼリー、くずれるクッキー、ループ
function okashi1() {
  const b = new Builder(0);
  b.flat(18); // -6 … 12
  b.stars(3, 0.9, 6, 1.2);
  b.add('enemy', 10, 0, { x0: 7, x1: 11.5, type: 'hop' });
  b.flat(10); // 12 … 22
  // エレベーター：乗ると高い所まで運んでくれる
  b.add('sign', 13, 0, { icon: 'up' });
  b.platform(19, 0, 3, 17, { type: 'move', dy: 3.8, period: 5 }); // がけにぴったりつける
  b.stars(20.5, 1.6, 1); b.stars(20.5, 2.9, 1);
  b.step(3.8).flat(14); // 22 … 36 (高さ3.8)
  b.stars(23, 0.9, 6, 1.4);
  b.add('enemy', 31, 0, { x0: 27, x1: 35, type: 'hop' });
  b.slope(10, -3.8).flat(6); // 36 … 46 … 52 (高さ0)
  b.stars(37, 0.8, 7, 1.4);
  b.add('checkpoint', 48);
  // 渡し舟：広い穴は動く足場で渡る
  b.add('sign', 50, 0, { icon: 'right' });
  b.gap(8); // 52 … 60
  b.platform(51.5, 0, 3, 51, { type: 'move', dx: 6, period: 5.5 });
  b.stars(53, 1.3, 6, 1.2);
  b.flat(12); // 60 … 72
  b.platform(63, 2.2, 3);
  b.add('medal', 64.5, 1.2, { onPlat: true });
  b.add('enemy', 67, 0, { x0: 64.5, x1: 69.4, type: 'hop' });
  b.gap(2.4); // 72 … 74.4
  b.stars(70.6, 1.4, 5, 1.2, 1.6);
  b.flat(14); // 74.4 … 88.4
  b.add('spring', 80);
  b.platform(81.2, 5.4, 6);
  b.stars(81.6, 6.2, 5, 1.1);
  b.add('dash', 86);
  b.flat(20); // 88.4 … 108.4
  b.stars(89, 0.8, 11, 1.7);
  b.add('checkpoint', 110);
  b.flat(6); // 108.4 … 114.4
  // 2つめの渡し舟：長め
  b.gap(9); // 114.4 … 123.4
  b.platform(113.9, 0, 3, 113, { type: 'move', dx: 7, period: 6 });
  b.platform(117.4, 2.3, 2.4, 113);
  b.add('medal', 118.6, 1.1, { onPlat: true });
  b.flat(12); // 123.4 … 135.4
  b.add('enemy', 128, 0, { x0: 126, x1: 131, type: 'hop' });
  b.add('enemy', 133, 0, { x0: 131.5, x1: 135 });
  b.stars(125, 2.6, 8, 1.2);
  b.slope(6, 1.2).flat(6).slope(6, -1.2); // 135.4 … 153.4
  b.stars(136, 1, 12, 1.4);
  b.flat(8); // 153.4 … 161.4
  b.add('checkpoint', 155);
  // エレベーター2（下がってから上がる）
  b.platform(158.4, 0, 3, 158, { type: 'move', dy: 4.4, period: 5 });
  b.step(4.4).flat(10); // 161.4 … 171.4 (高さ4.4)
  b.platform(165, 2.2, 2.4, 165);
  b.add('medal', 166.2, 1.1, { onPlat: true });
  b.slope(12, -4.4).flat(18); // 171.4 … 183.4 … 201.4
  b.stars(172, 0.8, 8, 1.5);
  b.stars(186, 0.9, 6, 1.3);
  b.add('goal', 195, 1.3);
  return b.finish({ id: '2-1', world: 2, name: 'おかしの もり 1', theme: 'okashi' });
}

function okashi2() {
  const b = new Builder(0);
  b.flat(16); // -6 … 10
  b.stars(2, 0.9, 6, 1.2);
  // くずれるクッキー：乗ってしばらくすると落ちる（下は地面なので安心）
  b.flat(14); // 10 … 24
  b.platform(12, 2, 3, 12, { type: 'crumble' }); b.platform(16.5, 3.4, 3, 16, { type: 'crumble' });
  b.stars(12.5, 2.9, 3, 1); b.stars(17, 4.3, 3, 1);
  b.add('medal', 21.5, 5.2);
  b.add('enemy', 20, 0, { x0: 18, x1: 21.4, type: 'hop' });
  // 穴の上のクッキーの橋
  b.gap(7); // 24 … 31
  b.platform(24, 0, 2.5, 23, { type: 'crumble' });
  b.platform(26.5, 0, 2.5, 23, { type: 'crumble' });
  b.platform(29, 0, 2, 23, { type: 'crumble' });
  b.stars(25.5, 1, 5, 1.1);
  b.flat(10); // 31 … 41
  b.add('checkpoint', 34);
  // ループ！
  b.add('sign', 36, 0, { icon: 'right' });
  b.add('dash', 38);
  b.flat(20); // 41 … 61
  b.add('loop', 46, 0, { R: 2.4 });
  b.stars(45.5, 1.2, 1); b.stars(48.2, 2.6, 1); b.stars(47, 4.6, 1); b.stars(45.6, 2.6, 1);
  b.stars(51, 0.8, 7, 1.3);
  b.gap(2.6); // 61 … 63.6
  b.stars(59.8, 1.4, 5, 1.2, 1.7);
  b.flat(8); // 63.6 … 71.6
  // 渡し舟とクッキー
  b.gap(9); // 71.6 … 80.6
  b.platform(71.1, 0, 3, 70, { type: 'move', dx: 7, period: 5.5 });
  b.platform(73.5, 2.3, 2.4, 70, { type: 'crumble' });
  b.add('medal', 74.7, 1.2, { onPlat: true });
  b.flat(12); // 80.6 … 92.6
  b.add('checkpoint', 83);
  b.add('enemy', 88, 0, { x0: 85, x1: 91.5 });
  b.add('enemy', 91, 0, { x0: 89, x1: 92.3, type: 'hop' });
  b.stars(85, 2.6, 6, 1.2);
  b.step(1).flat(6).step(1).flat(6); // 92.6 … 104.6 (高さ2)
  b.slope(14, -3); // 104.6 … 118.6 (高さ -1)
  b.stars(105, 0.8, 9, 1.5);
  b.add('dash', 120);
  b.flat(24); // 118.6 … 142.6
  b.add('loop', 128, 0, { R: 2.6 });
  b.stars(135, 0.8, 6, 1.2);
  b.gap(2.6); // 142.6 … 145.2
  b.stars(141.3, 1.4, 5, 1.2, 1.7);
  b.flat(10); // 145.2 … 155.2
  b.add('checkpoint', 147);
  // クッキーの階段でメダル3
  b.platform(149, 1.9, 2.6, 149, { type: 'crumble' }); b.platform(152.6, 3.5, 2.6, 149, { type: 'crumble' });
  b.add('medal', 154, 5.2);
  b.add('enemy', 151, 0, { x0: 149.5, x1: 152.6, type: 'hop' });
  b.gap(2.6, 0.5); // 155.2 … 157.8 (高さ -0.5)
  b.stars(153.9, 1.5, 5, 1.2, 1.6);
  b.flat(20); // 157.8 … 177.8
  b.stars(160, 0.9, 6, 1.3);
  b.add('goal', 171, 1.3);
  return b.finish({ id: '2-2', world: 2, name: 'おかしの もり 2', theme: 'okashi' });
}

function okashi3() {
  const b = new Builder(0);
  b.flat(16); // -6 … 10
  b.stars(2, 0.9, 6, 1.2);
  b.platform(8, 2, 3, 8, { type: 'crumble' });
  b.add('medal', 9.5, 1.2, { onPlat: true });
  b.gap(8); // 10 … 18
  b.platform(9.5, 0, 3, 9, { type: 'move', dx: 6, period: 5 });
  b.flat(12); // 18 … 30
  b.add('enemy', 25, 0, { x0: 21, x1: 28, type: 'hop' });
  b.add('spring', 27.5);
  b.platform(28.8, 5.4, 4, 28);
  b.add('medal', 31.5, 1.1, { onPlat: true });
  b.flat(10); // 30 … 40
  b.add('checkpoint', 33);
  b.platform(35, 1.9, 2.4, 35, { type: 'crumble' });
  b.add('medal', 36.2, 1.1, { onPlat: true });
  b.add('heart', 38.5, 1);
  b.flat(20); // 40 … 60 ボスのひろば
  b.add('boss', 41, 0, { x1: 59, type: 'jelly', hp: 3 });
  b.flat(4); // 60 … 64
  return b.finish({ id: '2-3', world: 2, name: 'ぷるるんゼリー', theme: 'okashi', bossStage: true });
}

// ==================== ワールド3：ふわふわ くものうえ ====================
// ぽよんと弾む雲、上昇気流、空を飛ぶ敵、ループ
function kumo1() {
  const b = new Builder(0);
  b.flat(16); // -6 … 10
  b.stars(2, 0.9, 6, 1.2);
  // ぽよん雲：乗ると勝手に弾む。ジャンプを押していると高く
  b.add('sign', 8, 0, { icon: 'up' });
  b.gap(8); // 10 … 18
  b.platform(10, -0.4, 8, 9, { type: 'bouncy' }); // ぽよん雲の道
  b.stars(11.5, 2.5, 7, 0.9, 1.2);
  b.flat(12); // 18 … 30
  b.add('enemy', 25, 2.2, { x0: 21, x1: 28, type: 'fly' });
  b.stars(20, 0.9, 7, 1.3);
  // 上昇気流：中に入るとふわっと上へ
  b.add('updraft', 32.8, 0, { w: 2.4, height: 6.5 });
  b.flat(4); // 30 … 34
  b.step(4.5).flat(10); // 34 … 44 (高さ4.5)
  b.stars(32, 2, 1); b.stars(32, 3.5, 1); b.stars(32, 5, 1);
  b.add('checkpoint', 38);
  b.platform(40, 2.2, 2.4, 40);
  b.add('medal', 41.2, 1.1, { onPlat: true });
  b.gap(2.6); // 44 … 46.6
  b.stars(42.8, 1.4, 5, 1.2, 1.7);
  b.flat(6); // 46.6 … 52.6
  b.slope(10, -4.5).flat(8); // 52.6 … 62.6 … 70.6 (高さ0)
  b.stars(53, 0.8, 8, 1.3);
  b.add('enemy', 66, 2.3, { x0: 63, x1: 69, type: 'fly' });
  b.add('enemy', 66.5, 0, { x0: 64, x1: 68 });
  // ぽよん雲の連続（穴は広め、落ちてもしゃぼん玉）
  b.gap(12); // 70.6 … 82.6
  b.platform(70.6, -0.4, 5, 69, { type: 'bouncy' });
  b.platform(76.6, -0.4, 6, 69, { type: 'bouncy' });
  b.add('medal', 76.1, 6.2);
  b.stars(72, 3, 3, 1); b.stars(79.6, 3, 3, 1);
  b.flat(10); // 82.6 … 92.6
  b.add('checkpoint', 85);
  b.add('dash', 89);
  b.flat(20); // 92.6 … 112.6
  b.add('loop', 98, 0, { R: 2.4 });
  b.stars(104, 0.8, 7, 1.2);
  b.gap(2.8); // 112.6 … 115.4
  b.stars(111.3, 1.5, 5, 1.2, 1.7);
  b.flat(8); // 115.4 … 123.4
  b.add('enemy', 120, 2.2, { x0: 117, x1: 123, type: 'fly' });
  b.add('updraft', 126.2, 0, { w: 2.4, height: 6 });
  b.flat(4); // 123.4 … 127.4
  b.step(3).flat(8); // 127.4 … 135.4 (高さ3)
  b.platform(129.5, 2.3, 2.4, 130);
  b.add('medal', 130.7, 1.1, { onPlat: true });
  b.stars(126, 2.5, 1); b.stars(126, 4, 1); b.stars(126, 5.5, 1);
  b.slope(10, -3).flat(16); // 135.4 … 145.4 … 161.4
  b.stars(136, 0.8, 7, 1.4);
  b.add('checkpoint', 147);
  b.stars(149, 0.9, 5, 1.3);
  b.add('goal', 156, 1.3);
  return b.finish({ id: '3-1', world: 3, name: 'くものうえ 1', theme: 'kumo' });
}

function kumo2() {
  const b = new Builder(0);
  b.flat(14); // -6 … 8
  b.stars(2, 0.9, 5, 1.2);
  b.add('dash', 6);
  b.flat(16); // 8 … 24
  b.add('loop', 14, 0, { R: 2.4 });
  b.stars(19, 0.8, 4, 1.2);
  b.gap(2.8); // 24 … 26.8
  b.stars(22.6, 1.5, 5, 1.2, 1.8);
  b.flat(8); // 26.8 … 34.8
  b.add('enemy', 30, 2.2, { x0: 28, x1: 34, type: 'fly' });
  b.gap(14); // 34.8 … 48.8
  b.platform(34.8, -0.4, 7, 33, { type: 'bouncy' });
  b.platform(43, 1.5, 5.8, 33);
  b.add('medal', 39.5, 6.2);
  b.stars(35.5, 3, 5, 1.1); b.stars(43.5, 2.4, 4, 1.2);
  b.flat(6); // 48.8 … 54.8
  b.add('checkpoint', 51);
  b.add('updraft', 57.6, 0, { w: 2.4, height: 7 });
  b.flat(4); // 54.8 … 58.8
  b.step(5).flat(10); // 58.8 … 68.8 (高さ5)
  b.stars(56, 2.5, 1); b.stars(56, 4.5, 1); b.stars(56, 6.5, 1);
  b.add('enemy', 64, 1.8, { x0: 61, x1: 67.5, type: 'fly' });
  b.gap(3); // 68.8 … 71.8
  b.stars(67.4, 1.5, 5, 1.2, 1.8);
  b.flat(6); // 71.8 … 77.8
  b.slope(12, -5).flat(6); // 77.8 … 89.8 … 95.8 (高さ0)
  b.stars(78.5, 0.8, 8, 1.4);
  b.add('dash', 92);
  b.flat(14); // 95.8 … 109.8
  b.add('loop', 99, 0, { R: 2.6 });
  b.add('checkpoint', 106);
  // 雲の足場とぽよん雲の組み合わせ
  b.gap(10); // 109.8 … 119.8
  b.platform(109.8, -0.4, 10, 108, { type: 'bouncy' });
  b.platform(113.6, 3.4, 2.6, 108);
  b.add('medal', 114.9, 4.6);
  b.stars(110.5, 2.8, 3, 1); b.stars(116.8, 2.8, 3, 1);
  b.flat(12); // 119.8 … 131.8
  b.add('enemy', 125, 2.2, { x0: 122, x1: 130, type: 'fly' });
  b.add('enemy', 128, 0, { x0: 124, x1: 131 });
  b.stars(122, 0.9, 7, 1.3);
  b.add('updraft', 134.6, 0, { w: 2.4, height: 5.5 });
  b.flat(4); // 131.8 … 135.8
  b.step(3.5).flat(8); // 135.8 … 143.8 (高さ3.5)
  b.platform(137.5, 2.3, 2.4, 138);
  b.add('medal', 138.7, 1.1, { onPlat: true });
  b.gap(2.8); // 143.8 … 146.6
  b.stars(142.4, 1.5, 5, 1.2, 1.7);
  b.flat(4); // 146.6 … 150.6
  b.slope(10, -3.5).flat(18); // 150.6 … 160.6 … 178.6
  b.add('checkpoint', 162);
  b.stars(164, 0.9, 6, 1.3);
  b.add('goal', 172, 1.3);
  return b.finish({ id: '3-2', world: 3, name: 'くものうえ 2', theme: 'kumo' });
}

function kumo3() {
  const b = new Builder(0);
  b.flat(14); // -6 … 8
  b.stars(2, 0.9, 5, 1.2);
  b.gap(8); // 8 … 16
  b.platform(8, -0.4, 8, 7, { type: 'bouncy' });
  b.add('medal', 12, 6.2);
  b.flat(10); // 16 … 26
  b.add('enemy', 21, 2.2, { x0: 18, x1: 25, type: 'fly' });
  b.add('updraft', 28.8, 0, { w: 2.4, height: 6 });
  b.flat(4); // 26 … 30
  b.step(4).flat(8); // 30 … 38 (高さ4)
  b.stars(29, 2.5, 1); b.stars(29, 4, 1);
  b.platform(32, 2.3, 2.4, 32);
  b.add('medal', 33.2, 1.1, { onPlat: true });
  b.slope(6, -4).flat(6); // 38 … 44 … 50
  b.add('checkpoint', 45);
  b.platform(46.5, 2, 2.4, 46, { type: 'bouncy' });
  b.add('medal', 47.7, 7);
  b.add('heart', 49, 1);
  b.flat(20); // 50 … 70 ボスのひろば
  b.add('boss', 51, 0, { x1: 69, type: 'cloud', hp: 3 });
  b.flat(4); // 70 … 74
  return b.finish({ id: '3-3', world: 3, name: 'くもくもさん', theme: 'kumo', bossStage: true });
}

// ==================== ワールド4：きらきら うみべ ====================
// しゃぼん玉の乗りもの、カニ、トゲ（うに）、海の上の渡し舟
function umi1() {
  const b = new Builder(0);
  b.flat(18); // -6 … 12
  b.stars(2, 0.9, 6, 1.2);
  b.add('enemy', 10, 0, { x0: 6, x1: 11.5, type: 'crab' });
  // うに（トゲ）：さわると痛い。踏んでもダメ。飛びこえよう
  b.flat(12); // 12 … 24
  b.add('sign', 13, 0, { icon: 'jump' });
  b.add('spike', 17);
  b.stars(16, 1.6, 3, 1, 0.8);
  b.add('spike', 22);
  b.stars(21, 1.6, 3, 1, 0.8);
  // しゃぼん玉：ふきだし口から出る。乗って、ジャンプでおりる
  b.add('sign', 25, 0, { icon: 'up' });
  b.flat(6); // 24 … 30
  b.add('vent', 29.4, 0, { rise: 7 });
  b.step(5.5).flat(10); // 30 … 40 (高さ5.5)
  b.stars(28, 2.5, 1); b.stars(28, 4, 1); b.stars(28, 5.5, 1);
  b.add('checkpoint', 33);
  b.platform(35.5, 2.2, 2.4, 36);
  b.add('medal', 36.7, 1.1, { onPlat: true });
  b.slope(10, -5.5).flat(8); // 40 … 50 … 58 (高さ0)
  b.stars(41, 0.8, 7, 1.4);
  b.add('enemy', 53, 0, { x0: 50.5, x1: 55.4, type: 'crab' });
  b.gap(2.6); // 58 … 60.6
  b.stars(56.8, 1.4, 5, 1.2, 1.6);
  b.flat(10); // 60.6 … 70.6
  b.add('spike', 65);
  b.stars(64, 1.6, 3, 1, 0.8);
  // 海の渡し舟
  b.gap(9); // 70.6 … 79.6
  b.platform(70.1, 0, 3, 69, { type: 'move', dx: 7, period: 5.5 });
  b.stars(71.6, 1.3, 6, 1.2);
  b.flat(10); // 79.6 … 89.6
  b.add('checkpoint', 82);
  b.add('vent', 86, 0, { rise: 8 });
  b.platform(84.5, 7, 3, 86);
  b.add('medal', 86, 1.2, { onPlat: true });
  b.stars(86, 3, 1); b.stars(86, 5, 1);
  b.add('dash', 89);
  b.flat(20); // 89.6 … 109.6
  b.stars(91, 0.8, 11, 1.6);
  b.gap(2.8); // 109.6 … 112.4
  b.stars(108.2, 1.5, 5, 1.2, 1.7);
  b.flat(12); // 112.4 … 124.4
  b.add('spike', 116); b.add('spike', 120.5);
  b.stars(115, 1.6, 3, 1, 0.8); b.stars(119.5, 1.6, 3, 1, 0.8);
  b.add('checkpoint', 123);
  b.flat(12); // 124.4 … 136.4
  b.platform(127, 2, 2.4); b.platform(130.5, 3.6, 2.4);
  b.add('medal', 131.7, 1.1, { onPlat: true });
  b.add('enemy', 133, 0, { x0: 128, x1: 135.5, type: 'crab' });
  b.flat(18); // 136.4 … 154.4
  b.stars(138, 0.9, 6, 1.3);
  b.add('goal', 148, 1.3);
  return b.finish({ id: '4-1', world: 4, name: 'うみべ 1', theme: 'umi' });
}

function umi2() {
  const b = new Builder(0);
  b.flat(14); // -6 … 8
  b.stars(2, 0.9, 5, 1.2);
  b.gap(9); // 8 … 17
  b.platform(7.5, 0, 3, 7, { type: 'move', dx: 7, period: 5.5 });
  b.flat(10); // 17 … 27
  b.add('spike', 20.5); b.add('spike', 23.8);
  b.stars(19.5, 1.6, 3, 1, 0.8); b.stars(22.8, 1.6, 3, 1, 0.8);
  b.gap(2.8); // 27 … 29.8
  b.stars(25.6, 1.5, 5, 1.2, 1.7);
  b.flat(8); // 29.8 … 37.8
  b.add('vent', 34, 0, { rise: 8 });
  b.platform(36, 7.4, 3, 34);
  b.add('medal', 37.5, 1.2, { onPlat: true });
  b.stars(34, 3, 1); b.stars(34, 5, 1);
  b.add('checkpoint', 32);
  // エレベーターと渡し舟の組み合わせ
  b.gap(10); // 37.8 … 47.8
  b.platform(37.3, 0, 3, 36, { type: 'move', dx: 8, period: 6 });
  b.flat(4); // 47.8 … 51.8
  b.platform(48.8, 0, 3, 48, { type: 'move', dy: 4, period: 5 });
  b.step(4).flat(10); // 51.8 … 61.8 (高さ4)
  b.add('enemy', 58, 0, { x0: 54, x1: 61, type: 'crab' });
  b.stars(53, 0.9, 6, 1.3);
  b.slope(8, -4).flat(6); // 61.8 … 69.8 … 75.8
  b.add('checkpoint', 71);
  b.gap(2.8); // 75.8 … 78.6
  b.stars(74.4, 1.4, 5, 1.2, 1.7);
  b.flat(10); // 78.6 … 88.6
  b.add('enemy', 84, 0, { x0: 81.2, x1: 88, type: 'crab' });
  b.add('enemy', 86, 0, { x0: 83, x1: 88.2 });
  b.add('vent', 92, 0, { rise: 8 });
  b.flat(4); // 88.6 … 92.6
  b.step(6).flat(8); // 92.6 … 100.6 (高さ6)
  b.stars(90.5, 3, 1); b.stars(90.5, 5, 1); b.stars(90.5, 7, 1);
  b.platform(96, 2.4, 2.4, 96);
  b.add('medal', 97.2, 1.1, { onPlat: true });
  b.slope(12, -6).flat(4); // 100.6 … 112.6 … 116.6
  b.stars(101, 0.8, 8, 1.4);
  b.add('dash', 114);
  b.flat(18); // 116.6 … 134.6
  b.add('loop', 122, 0, { R: 2.4 });
  b.add('checkpoint', 131);
  b.gap(9); // 134.6 … 143.6
  b.platform(134.1, 0, 3, 133, { type: 'move', dx: 7, period: 5 });
  b.platform(136.5, 2.3, 2.4, 133);
  b.add('medal', 137.7, 1.1, { onPlat: true });
  b.flat(12); // 143.6 … 155.6
  b.add('spike', 147); b.add('spike', 151);
  b.stars(146, 1.6, 3, 1, 0.8); b.stars(150, 1.6, 3, 1, 0.8);
  b.flat(16); // 155.6 … 171.6
  b.add('enemy', 160, 0, { x0: 157, x1: 163, type: 'crab' });
  b.stars(158, 0.9, 6, 1.3);
  b.add('goal', 166, 1.3);
  return b.finish({ id: '4-2', world: 4, name: 'うみべ 2', theme: 'umi' });
}

function umi3() {
  const b = new Builder(0);
  b.flat(14); // -6 … 8
  b.stars(2, 0.9, 5, 1.2);
  b.add('spike', 6);
  b.flat(8); // 8 … 16
  b.add('vent', 12, 0, { rise: 7.5 });
  b.platform(13.5, 7, 3, 12);
  b.add('medal', 15, 1.2, { onPlat: true });
  b.gap(8); // 16 … 24
  b.platform(15.5, 0, 3, 15, { type: 'move', dx: 6, period: 5 });
  b.flat(12); // 24 … 36
  b.add('enemy', 30, 0, { x0: 26.6, x1: 34, type: 'crab' });
  b.platform(27, 2.2, 2.4);
  b.add('medal', 28.2, 1.1, { onPlat: true });
  b.add('checkpoint', 35);
  b.flat(6); // 36 … 42
  b.platform(38, 2, 2.4);
  b.add('medal', 39.2, 1.1, { onPlat: true });
  b.add('heart', 41, 1);
  b.flat(20); // 42 … 62 ボスのひろば
  b.add('boss', 43, 0, { x1: 61, type: 'crab', hp: 3 });
  b.flat(4); // 62 … 66
  return b.finish({ id: '4-3', world: 4, name: 'おおきなカニ', theme: 'umi', bossStage: true });
}

// ==================== ワールド5：ほしぞらの おしろ ====================
// ほしのスイッチで橋が出る。これまでのしかけのまとめ
function hoshi1() {
  const b = new Builder(0);
  b.flat(16); // -6 … 10
  b.stars(2, 0.9, 6, 1.2);
  // ほしのスイッチ：さわると、先の穴に橋がかかる
  b.add('sign', 8, 0, { icon: 'right' });
  b.add('switch', 11, 0, { group: 1 });
  b.flat(4); // 10 … 14
  b.gap(8); // 14 … 22
  b.platform(14, 0, 8, 13, { type: 'bridge', group: 1 });
  b.stars(15, 1, 6, 1.2);
  b.flat(12); // 22 … 34
  b.add('enemy', 28, 2.2, { x0: 24, x1: 32, type: 'fly' });
  b.add('spike', 30);
  b.stars(29, 1.6, 3, 1, 0.8);
  b.add('checkpoint', 33);
  b.flat(6); // 34 … 40
  b.platform(35, 2, 2.4, 35, { type: 'crumble' });
  b.platform(38.5, 3.6, 2.4, 35, { type: 'crumble' });
  b.add('medal', 39.7, 1.2, { onPlat: true });
  b.gap(2.8); // 40 … 42.8
  b.stars(38.6, 1.5, 5, 1.2, 1.7);
  b.flat(10); // 42.8 … 52.8
  b.add('enemy', 47, 0, { x0: 45.4, x1: 50.2, type: 'hop' });
  b.add('switch', 51, 0, { group: 2 });
  b.gap(9); // 52.8 … 61.8
  b.platform(52.8, 0, 9, 51, { type: 'bridge', group: 2 });
  b.stars(54, 1, 7, 1.2);
  b.flat(8); // 61.8 … 69.8
  b.add('updraft', 68.6, 0, { w: 2.4, height: 6.5 });
  b.step(4.5).flat(8); // 69.8 … 77.8 (高さ4.5)
  b.stars(66, 2.5, 1); b.stars(66, 4.2, 1); b.stars(66, 5.9, 1);
  b.add('checkpoint', 72);
  b.platform(74, 2.3, 2.4, 74);
  b.add('medal', 75.2, 1.1, { onPlat: true });
  b.slope(10, -4.5).flat(6); // 77.8 … 87.8 … 93.8
  b.stars(78.5, 0.8, 7, 1.4);
  b.gap(9); // 93.8 … 102.8
  b.platform(93.3, 0, 3, 92, { type: 'move', dx: 7, period: 5.5 });
  b.flat(12); // 102.8 … 114.8
  b.add('enemy', 107, 2.3, { x0: 104, x1: 112, type: 'fly' });
  b.add('enemy', 109, 0, { x0: 106, x1: 112.2 });
  b.stars(104, 0.9, 6, 1.3);
  b.gap(2.8); // 114.8 … 117.6
  b.stars(113.4, 1.6, 5, 1.2, 1.7);
  b.flat(8); // 117.6 … 125.6
  b.add('checkpoint', 119);
  b.gap(10); // 125.6 … 135.6
  b.platform(125.6, -0.4, 10, 124, { type: 'bouncy' });
  b.add('medal', 130.6, 6.2);
  b.flat(18); // 135.6 … 153.6
  b.stars(137, 0.9, 6, 1.3);
  b.add('goal', 147, 1.3);
  return b.finish({ id: '5-1', world: 5, name: 'ほしぞらの おしろ 1', theme: 'hoshi' });
}

function hoshi2() {
  const b = new Builder(0);
  b.flat(14); // -6 … 8
  b.stars(2, 0.9, 5, 1.2);
  b.add('dash', 6);
  b.flat(16); // 8 … 24
  b.add('loop', 13, 0, { R: 2.5 });
  b.add('switch', 22, 0, { group: 1 });
  b.gap(9); // 24 … 33
  b.platform(24, 0, 9, 23, { type: 'bridge', group: 1 });
  b.platform(26.5, 2.3, 2.4, 23);
  b.add('medal', 27.7, 1.1, { onPlat: true });
  b.flat(10); // 33 … 43
  b.add('enemy', 38, 0, { x0: 35.6, x1: 40.4, type: 'hop' });
  b.add('enemy', 40, 2.3, { x0: 36, x1: 42, type: 'fly' });
  b.stars(35, 0.9, 6, 1.2);
  b.add('checkpoint', 42);
  b.gap(9); // 43 … 52
  b.platform(42.5, 0, 3, 41, { type: 'move', dx: 7, period: 5.5 });
  b.flat(6); // 52 … 58
  b.add('spike', 55);
  b.stars(54, 1.6, 3, 1, 0.8);
  b.add('vent', 61.4, 0, { rise: 7 });
  b.flat(4); // 58 … 62
  b.step(5.5).flat(10); // 62 … 72 (高さ5.5)
  b.stars(60, 3, 1); b.stars(60, 5, 1);
  b.add('enemy', 67, 0, { x0: 64, x1: 69.4, type: 'crab' });
  b.gap(2.8); // 72 … 74.8
  b.stars(70.6, 1.5, 5, 1.2, 1.7);
  b.flat(6); // 74.8 … 80.8
  b.platform(76, 2.4, 2.4, 76, { type: 'crumble' });
  b.add('medal', 77.2, 1.1, { onPlat: true });
  b.slope(12, -5.5).flat(6); // 80.8 … 92.8 … 98.8
  b.add('checkpoint', 94);
  b.stars(81.5, 0.8, 8, 1.4);
  b.gap(12); // 98.8 … 110.8
  b.platform(98.8, -0.4, 5.5, 97, { type: 'bouncy' });
  b.platform(105.3, -0.4, 5.5, 97, { type: 'bouncy' });
  b.stars(100.2, 3, 3, 1); b.stars(107.8, 3, 3, 1);
  b.flat(10); // 110.8 … 120.8
  b.add('updraft', 119.6, 0, { w: 2.4, height: 6 });
  b.add('enemy', 115, 0, { x0: 113.4, x1: 117 });
  b.step(4).flat(8); // 120.8 … 128.8 (高さ4)
  b.stars(118, 2.5, 1); b.stars(118, 4, 1);
  b.add('switch', 127, 0, { group: 2 });
  b.gap(9); // 128.8 … 137.8
  b.platform(128.8, 0, 9, 127, { type: 'bridge', group: 2 });
  b.add('enemy', 133, 2.3, { x0: 130, x1: 136, type: 'fly' });
  b.flat(6); // 137.8 … 143.8
  b.add('checkpoint', 139);
  b.slope(10, -4).flat(6); // 143.8 … 153.8 … 159.8
  b.stars(144.5, 0.8, 7, 1.4);
  b.add('spike', 157);
  b.stars(156, 1.6, 3, 1, 0.8);
  b.flat(10); // 159.8 … 169.8
  b.platform(162, 2, 2.4); b.platform(165.5, 3.6, 2.4);
  b.add('medal', 166.7, 1.1, { onPlat: true });
  b.add('enemy', 167, 0, { x0: 163, x1: 169.5, type: 'hop' });
  b.flat(18); // 169.8 … 187.8
  b.stars(171, 0.9, 6, 1.3);
  b.add('goal', 181, 1.3);
  return b.finish({ id: '5-2', world: 5, name: 'ほしぞらの おしろ 2', theme: 'hoshi' });
}

function hoshi3() {
  const b = new Builder(0);
  b.flat(14); // -6 … 8
  b.stars(2, 0.9, 5, 1.2);
  b.add('switch', 6, 0, { group: 1 });
  b.gap(8); // 8 … 16
  b.platform(8, 0, 8, 7, { type: 'bridge', group: 1 });
  b.platform(10.5, 2.3, 2.4, 7);
  b.add('medal', 11.7, 1.1, { onPlat: true });
  b.flat(10); // 16 … 26
  b.add('enemy', 21, 2.3, { x0: 18, x1: 25, type: 'fly' });
  b.add('updraft', 28.8, 0, { w: 2.4, height: 6 });
  b.flat(4); // 26 … 30
  b.step(4).flat(8); // 30 … 38 (高さ4)
  b.platform(32.5, 2.3, 2.4, 33);
  b.add('medal', 33.7, 1.1, { onPlat: true });
  b.slope(6, -4).flat(6); // 38 … 44 … 50
  b.add('checkpoint', 45);
  b.platform(46.5, 1.9, 2.4, 46);
  b.add('medal', 47.7, 1.1, { onPlat: true });
  b.add('heart', 49, 1);
  b.flat(20); // 50 … 70 ボスのひろば
  b.add('boss', 51, 0, { x1: 69, type: 'wind', hp: 4 });
  b.flat(4); // 70 … 74
  return b.finish({ id: '5-3', world: 5, name: 'いたずらかぜ', theme: 'hoshi', bossStage: true, final: true });
}

export const STAGES = [nohara1(), nohara2(), nohara3(), okashi1(), okashi2(), okashi3(), kumo1(), kumo2(), kumo3(), umi1(), umi2(), umi3(), hoshi1(), hoshi2(), hoshi3()];

export const WORLDS = [
  { id: 1, name: 'おはなの のはら', icon: '🌷', theme: 'nohara' },
  { id: 2, name: 'おかしの もり', icon: '🍰', theme: 'okashi' },
  { id: 3, name: 'ふわふわ くものうえ', icon: '☁️', theme: 'kumo' },
  { id: 4, name: 'きらきら うみべ', icon: '🐚', theme: 'umi' },
  { id: 5, name: 'ほしぞらの おしろ', icon: '🏰', theme: 'hoshi' },
];
