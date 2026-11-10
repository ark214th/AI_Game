// ゲームのデータ（しま・はし・ともだち・あそび・シール・おてがみ・かけら）
// 画面に出る字は ひらがな・カタカナ だけにする（漢字を使わない）

// ---- しま と はし ----
// しまは まるい。r は みための はんけい、あるける のは r - EDGE まで
export const EDGE = 1.4;
export const ISLANDS = [
  { id: 'nohara', name: 'おはなの のはら', x: 0, z: 0, r: 22 },
  { id: 'umibe', name: 'きらきら うみべ', x: 54, z: 0, r: 20 },
  // ここから さきは じゅんびちゅう（もやの むこうに みえる だけ）
  { id: 'okashi', name: 'おかしの もり', x: 0, z: -56, r: 18, soon: true },
];

// はし。a → b を むすぶ。fog が あると、その もやが はれるまで わたれない
export const BRIDGES = [
  { id: 'b-umibe', from: 'nohara', to: 'umibe', a: { x: 20, z: 0 }, b: { x: 35.5, z: 0 }, hw: 1.7 },
  { id: 'b-okashi', from: 'nohara', to: 'okashi', a: { x: 0, z: -20 }, b: { x: 0, z: -39.5 }, hw: 1.7, fog: 'okashi', soon: true },
];

// もや。えがおが need に なると はれる
export const FOGS = [
  { id: 'okashi', need: 2, x: 0, z: -30 },
];

// とおれない もの（き・いわ・いけ）。まるで あたりを とる
export const TREES = [
  { x: -8, z: -6, s: 1 }, { x: 9, z: 9, s: 1.15 }, { x: -17, z: -9, s: 0.9 }, { x: 14, z: -12, s: 1 },
  { x: -4, z: 17, s: 1.05 }, { x: 12, z: 16, s: 0.85 }, { x: -18, z: 2, s: 1 },
  { x: 43, z: -10, s: 1, palm: true }, { x: 66, z: -13, s: 1.1, palm: true }, { x: 48, z: -15, s: 0.9, palm: true },
];
export const ROCKS = [
  { x: -11, z: 15, r: 0.9 }, { x: 17, z: 6, r: 1.1 }, { x: -15, z: -14, r: 1.0 },
  { x: 68, z: -3, r: 1.2 }, { x: 40, z: 4, r: 0.9 },
];
export const POND = { x: -12, z: 7, r: 4.2 };

// ---- うみべの なみ ----
// うみは まるく、はんけいが ひろがったり ちぢんだり する（＝なみが よせて ひく）
export const SEA = { x: 54, z: 23, mid: 15.6, amp: 2.1, period: 7.5, deep: 12.4 };

// ---- ともだち ----
// home は しまの うえの ばしょ。bubble は こまった ときの ふきだしの え
// say：はなす ことば（みじかい ぶん。ひらがな・カタカナ だけ）
//   ask＝はなしかけた とき ／ again＝もういちど あそぶ とき ／ done＝えがおに なった とき
export const FRIENDS = [
  {
    id: 'chapu', name: 'ちゃぷ', icon: '🦦', bubble: '🐚', home: { x: -5, z: 3 }, island: 'nohara', play: 'shells',
    say: {
      ask: ['えーん… だいじな かいがらを なくしちゃった', 'はまべに あると おもうんだ。いっしょに さがして！'],
      beach: ['なみが ひいたら かいがらが でてくるよ', 'かいがらに さわって ひろってね！'],
      tip: 'うみの おくに にじいろの かいがらも あるよ',
      again: ['もういちど さがそう！ にじいろの かいがらも みつけてね'],
      done: 'ぜんぶ みつかった！ ありがとう！',
    },
  },
  {
    id: 'kani', name: 'おおきなカニ', icon: '🦀', bubble: '✊', home: { x: 61, z: -7 }, island: 'umibe', play: 'janken',
    say: {
      ask: ['ひまだなあ… だれか あそんで くれない かなあ', 'きみ、じゃんけん しようよ チョキ！ 3かい かったら きみの かち！', 'ぼくは だす まえに、てが ちらっと みえちゃうんだ。よーく みててね'],
      again: ['もう ひとしょうぶ チョキ！ こんどは まけないぞ〜'],
      done: 'まけた〜！ でも たのしかった チョキ！',
    },
  },
];

// がめんの うえに でる「いま する こと」
export const GOALS = {
  move: 'がめんを さわって ひっぱると あるけるよ',
  talk: 'に はなしかけよう',
  toBeach: 'はしを わたって はまべへ いこう',
  shells: 'なみが ひいたら かいがらを ひろおう',
  soon: 'つづきは じゅんびちゅう。また あそんでね',
  guide: 'ちょうちょが みちを おしえて くれるよ',
};

// じゃんけんの とき、ぷにゅが たつ ばしょ（カニの ばしょから みて）
export const JANKEN_SPOT = { x: -4.1, z: 0.6 };

// ---- あそび ----
// かいがら：3つ ひろえば せいこう。にじいろの かいがら（なみが いちばん ひいた ときだけ でる）で はなまるが ふえる
// d は うみの まんなか からの きょり。なみの はんけいが d より ちいさい ときだけ ひろえる
export const SHELLS = [
  { ang: -2.05, d: 16.6 }, { ang: -1.57, d: 17.0 }, { ang: -1.1, d: 16.5 },
  { ang: -1.82, d: 14.3, rainbow: true }, { ang: -1.33, d: 14.2, rainbow: true },
];
export const SHELL_NEED = 3;
export const shellPos = (sh) => ({ x: SEA.x + Math.cos(sh.ang) * sh.d, z: SEA.z + Math.sin(sh.ang) * sh.d });
// ちょうちょが あんないする はまべの まんなか
export const BEACH_SPOT = { x: 54, z: 4.5 };

// じゃんけん：3かい かてば せいこう。だす まえに カニの はさみが「ぴくっ」と うごいて てが みえる
export const HANDS = ['gu', 'choki', 'pa'];
export const HAND_ICON = { gu: '✊', choki: '✌️', pa: '✋' };
export const BEATS = { gu: 'choki', choki: 'pa', pa: 'gu' };   // key が value に かつ
export const JANKEN_WINS = 3;
// てが みえる ながさ（ミリびょう）。かいを かさねると みじかく なる
export const TELL_MS = [1300, 1000, 800, 650, 520, 430];

// ---- きらきらのかけら ----
export const SHARDS = [
  { x: 6, z: 14 }, { x: -6, z: -13 }, { x: 15, z: -4 }, { x: -14, z: 13 }, { x: 3, z: -17 }, { x: -13, z: -3 },
  { x: 28, z: 0 }, { x: 44, z: -4 }, { x: 58, z: -15 }, { x: 69, z: 4 }, { x: 50, z: 5 }, { x: 62, z: 2 },
];
export const SHARD_NAME = 'きらきらのかけら';

// ---- シール と おてがみ ----
export const STICKERS = [
  { id: 'chapu', icon: '🦦', name: 'ちゃぷシール' },
  { id: 'kani', icon: '🦀', name: 'かにシール' },
];
export const LETTERS = [
  { id: 'chapu', from: 'ちゃぷ', icon: '🦦', text: 'かいがら いっしょに さがして くれて ありがとう' },
  { id: 'kani', from: 'おおきなカニ', icon: '🦀', text: 'じゃんけん たのしかったー！ また やろうね' },
];

// ---- うごき ----
export const SPEED = 8;
export const PLAYER_START = { x: 0, z: 9 };
export const TALK_R = 4.4;      // はなしかけ られる きょり
export const TOUCH_R = 1.7;     // かけら・かいがらに ふれる きょり
export const FOLLOW_GAP = 2.4;  // ついてくる ともだちの あいだ
