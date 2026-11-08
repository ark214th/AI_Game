// ゲームのデータ（ともだち・ミッション・シール・おてがみ・かけら）
// 画面に出る字は ひらがな・カタカナ だけにする（漢字を使わない）

// ともだち。pos は しまの うえの ばしょ（x, z）。bubble は こまった ときの ふきだしの え
export const FRIENDS = [
  { id: 'kani', name: 'おおきなカニ', icon: '🦀', bubble: '✊', pos: { x: 17, z: 10 }, color: 0xff7a59 },
  { id: 'chapu', name: 'ちゃぷ', icon: '🦦', bubble: '🐚', pos: { x: -16, z: 10 }, color: 0xa9744f },
  { id: 'kaze', name: 'いたずらかぜ', icon: '🌀', bubble: '🎩', pos: { x: 12, z: -12 }, color: 0x9fd8ef },
  { id: 'jelly', name: 'ぷるるんゼリー', icon: '🍮', bubble: '🍦', pos: { x: -14, z: -8 }, color: 0xffb7d5 },
  { id: 'kumokumo', name: 'くもくもさん', icon: '💤', bubble: '⭐', pos: { x: 0, z: -15.5 }, color: 0xffffff },
];

// こまった が でてくる じゅんばん（だんかい かいほう）
export const STAGES = [
  ['kani', 'chapu'],
  ['kaze', 'jelly'],
  ['kumokumo'],
];

// ミッションの ないよう（かず・しかた）
export const MISSIONS = {
  kani: { type: 'janken', wins: 2 },        // じゃんけん：2かい かったら せいこう
  kaze: { type: 'hat', touches: 5 },        // ぼうし：5かい さわったら せいこう
  kumokumo: { type: 'stars', count: 5 },    // ほし：5つ あつめたら せいこう（1つは にげる）
  chapu: { type: 'shells', count: 3 },      // かいがら：3つ さがしたら せいこう
  jelly: { type: 'cream', taps: 5 },        // クリーム：5かい トントンしたら せいこう
};

// じゃんけんの て（あいての て と くらべる）
export const HANDS = ['gu', 'choki', 'pa'];
export const HAND_ICON = { gu: '✊', choki: '✌️', pa: '✋' };

// ぼうしが とんでいく ばしょの こうほ
export const HAT_SPOTS = [
  { x: 0, z: 16 }, { x: -10, z: 2 }, { x: 8, z: 6 }, { x: -4, z: -14 },
  { x: 18, z: -4 }, { x: -19, z: -2 }, { x: 4, z: -4 }, { x: -8, z: 17 },
];

// ほしの おちている ばしょ（kumokumo ミッション）。runner は 1かい にげる ほし
export const STAR_SPOTS = [
  { x: -6, z: -14 }, { x: 7, z: -16 }, { x: -12, z: -19 }, { x: 11, z: -9 }, { x: 0, z: -10 },
];
export const STAR_RUNNER = 2;
export const STAR_RUNNER_TO = { x: 14, z: -19 };

// かいがらの かくれている ばしょ（chapu ミッション）
export const SHELL_SPOTS = [
  { x: 12, z: 17 }, { x: -11, z: 14 }, { x: 20, z: 3 },
];

// きらきらのかけら（あつめると シールちょうの「はっけん」に きろく）
export const SHARD_SPOTS = [
  { x: 5, z: 19 }, { x: -5, z: 7 }, { x: 14, z: 0 }, { x: -18, z: 4 }, { x: 9, z: -7 },
  { x: -9, z: -13 }, { x: 20, z: 14 }, { x: -20, z: 13 }, { x: 3, z: -20 }, { x: -14, z: 19 },
];
export const SHARD_NAME = 'きらきらのかけら';

// えがおシール（ともだちを たすけると もらえる）
export const STICKERS = [
  { id: 'kani', icon: '🦀', name: 'かにシール' },
  { id: 'chapu', icon: '🦦', name: 'ちゃぷシール' },
  { id: 'kaze', icon: '🌀', name: 'かぜシール' },
  { id: 'jelly', icon: '🍮', name: 'ゼリーシール' },
  { id: 'kumokumo', icon: '💤', name: 'くもシール' },
  { id: 'niji', icon: '🌈', name: 'にじシール' },
];

// おてがみ（絵が ちゅうしん。ぶんは ひとこと だけ）
export const LETTERS = [
  { id: 'kani', from: 'おおきなカニ', icon: '🦀', text: 'じゃんけん たのしかったー！' },
  { id: 'chapu', from: 'ちゃぷ', icon: '🦦', text: 'かいがら みつけて くれて ありがとう' },
  { id: 'kaze', from: 'いたずらかぜ', icon: '🌀', text: 'ぼうし とんでっちゃったのに ありがとう' },
  { id: 'jelly', from: 'ぷるるんゼリー', icon: '🍮', text: 'クリーム もりもり うれしい！' },
  { id: 'kumokumo', from: 'くもくもさん', icon: '💤', text: 'ほしが もどって ぐっすり ねむれるよ' },
];

// しまの おおきさ と プレイヤーの はやさ
export const ISLAND_R = 26;
export const PLAYER_R = 24.2;
export const SPEED = 7;
export const NEAR = 2.6;
export const PLAYER_START = { x: 0, z: 15 };
