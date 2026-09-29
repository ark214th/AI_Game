// 記憶の館：部屋（決まった道順）と置き場（家具）。
// 家具ごとに「品物との奇妙な相互作用」を用意する。文は「{品物}が{家具}」に続けて読む。
// motion は ui 側のアニメーション名、fx はまわりに飛ぶ小さな絵。

export const FURNITURE = {
  door: { name: '大扉', emoji: '🚪', reactions: [
    { t: 'にはさまって、ぺちゃんこに！', motion: 'squash', fx: '💥' },
    { t: 'のドアノブにぶら下がって、ぶらんぶらん', motion: 'wobble', fx: '💫' },
    { t: 'をノックしたら、中からもう一つ出てきた', motion: 'grow', fx: '✨' },
  ] },
  mirror: { name: '鏡', emoji: '🪞', reactions: [
    { t: 'に映った自分と、ケンカを始めた', motion: 'shake', fx: '💢' },
    { t: 'の中へ、うずを巻いて吸いこまれた', motion: 'shrink', fx: '🌀' },
    { t: 'の前でポーズを決めて、うっとり', motion: 'glow', fx: '💖' },
  ] },
  bell: { name: '呼び鈴', emoji: '🛎️', reactions: [
    { t: 'を鳴らしまくって、チンチンうるさい', motion: 'bounce', fx: '🔔' },
    { t: 'の上で逆立ちしている', motion: 'flip', fx: '🎵' },
    { t: 'に頭をぶつけて、目がまわる', motion: 'spin', fx: '💫' },
  ] },
  statue: { name: '石像', emoji: '🗿', reactions: [
    { t: 'と背くらべして、ぐんぐん大きくなる', motion: 'grow', fx: '⬆️' },
    { t: 'の鼻の穴に、すっぽりはまった', motion: 'shrink', fx: '👃' },
    { t: 'といっしょに、カチコチに固まった', motion: 'shake', fx: '🧊' },
  ] },
  sofa: { name: 'ソファ', emoji: '🛋️', reactions: [
    { t: 'にしずみこんで、ぐうぐういびき', motion: 'sink', fx: '💤' },
    { t: 'の上でトランポリン', motion: 'bounce', fx: '🌟' },
    { t: 'のすき間から、小銭といっしょに出てきた', motion: 'flip', fx: '🪙' },
  ] },
  fireplace: { name: '暖炉', emoji: '🔥', reactions: [
    { t: 'の炎の中でタップダンス！', motion: 'dance', fx: '🔥' },
    { t: 'でこんがり焼けて、いいにおい', motion: 'glow', fx: '🔥' },
    { t: 'の煙突から、空へ飛んでいった', motion: 'fly', fx: '💨' },
  ] },
  clock: { name: '柱時計', emoji: '🕰️', reactions: [
    { t: 'の振り子にしがみついて、ゆらゆら', motion: 'wobble', fx: '⏳' },
    { t: 'の針といっしょに、ぐるぐる回る', motion: 'spin', fx: '🌀' },
    { t: 'の中から「ボーン！」と飛び出す', motion: 'bounce', fx: '🔔' },
  ] },
  piano: { name: 'ピアノ', emoji: '🎹', reactions: [
    { t: 'の鍵盤を走りまわって、大演奏', motion: 'dance', fx: '🎵' },
    { t: 'のふたにはさまって「ポロン」', motion: 'squash', fx: '🎶' },
    { t: 'の伴奏で、オペラを歌いだした', motion: 'bounce', fx: '🎤' },
  ] },
  pan: { name: 'フライパン', emoji: '🍳', reactions: [
    { t: 'でジュウジュウいためられた', motion: 'shake', fx: '♨️' },
    { t: 'の上で、くるっと宙返り', motion: 'flip', fx: '✨' },
    { t: 'の目玉焼きをふとんにして、お昼寝', motion: 'sink', fx: '💤' },
  ] },
  teapot: { name: 'ティーポット', emoji: '🫖', reactions: [
    { t: 'の口から、ぴゅーっと飛び出した', motion: 'fly', fx: '💨' },
    { t: 'の中で、お茶風呂につかってほっこり', motion: 'sink', fx: '♨️' },
    { t: 'のふたを帽子にして、おすまし', motion: 'bounce', fx: '🎩' },
  ] },
  barrel: { name: '樽', emoji: '🛢️', reactions: [
    { t: 'の中で、ぶどうジュースまみれ', motion: 'sink', fx: '🍇' },
    { t: 'に入って、ゴロゴロ転がっていった', motion: 'spin', fx: '🌀' },
    { t: 'の上に立って、見張り番', motion: 'glow', fx: '👀' },
  ] },
  basket: { name: 'かご', emoji: '🧺', reactions: [
    { t: 'の中で、たまごを温めている', motion: 'glow', fx: '🥚' },
    { t: 'から、あふれるほど増えていた', motion: 'grow', fx: '✨' },
    { t: 'に入れられて、ぶらんぶらん運ばれる', motion: 'wobble', fx: '🎈' },
  ] },
  bookshelf: { name: '本棚', emoji: '📚', reactions: [
    { t: 'の本を読みふけって、夢中', motion: 'glow', fx: '📖' },
    { t: 'の本がドミノ倒しになって、下じきに', motion: 'squash', fx: '💥' },
    { t: 'の本にはさまれて、しおりになった', motion: 'shrink', fx: '🔖' },
  ] },
  telescope: { name: '望遠鏡', emoji: '🔭', reactions: [
    { t: 'をのぞいたら、月まで飛んでいった', motion: 'fly', fx: '🌙' },
    { t: 'の筒の中を、すべり台みたいにすべる', motion: 'shrink', fx: '✨' },
    { t: 'で見ると、10倍の大きさに', motion: 'grow', fx: '🔍' },
  ] },
  portrait: { name: '肖像画', emoji: '🖼️', reactions: [
    { t: 'の貴婦人に、キスされた', motion: 'glow', fx: '💋' },
    { t: 'の中に入って、すまし顔の絵になった', motion: 'shrink', fx: '🎨' },
    { t: 'の目にじっと見られて、ふるえる', motion: 'shake', fx: '👀' },
  ] },
  drawer: { name: '引き出し', emoji: '🗄️', reactions: [
    { t: 'をあけるたびに、ぴょんと飛び出す', motion: 'bounce', fx: '🎁' },
    { t: 'の奥にしまわれて、カギをかけられた', motion: 'sink', fx: '🔒' },
    { t: 'の中で、たくさん増えていた', motion: 'grow', fx: '✨' },
  ] },
  bathtub: { name: '浴槽', emoji: '🛁', reactions: [
    { t: 'の泡の中で、シンクロナイズドスイミング', motion: 'spin', fx: '🫧' },
    { t: 'につかって、のぼせて真っ赤', motion: 'glow', fx: '♨️' },
    { t: 'の栓をぬいたら、うずに吸いこまれた', motion: 'shrink', fx: '🌀' },
  ] },
  toilet: { name: 'トイレ', emoji: '🚽', reactions: [
    { t: 'に流されそうになって、必死でしがみつく', motion: 'shake', fx: '💦' },
    { t: 'のふたの上で、考えごと', motion: 'wobble', fx: '💭' },
    { t: 'から、ザバーンと飛び出してきた', motion: 'fly', fx: '💦' },
  ] },
  shower: { name: 'シャワー', emoji: '🚿', reactions: [
    { t: 'をあびて、ピカピカに光る', motion: 'glow', fx: '✨' },
    { t: 'の水の勢いで、くるくる回る', motion: 'spin', fx: '💧' },
    { t: 'の下で歌って、エコーがすごい', motion: 'bounce', fx: '🎵' },
  ] },
  soap: { name: '石けん', emoji: '🧼', reactions: [
    { t: 'でつるんとすべって、ひっくり返る', motion: 'flip', fx: '🫧' },
    { t: 'の泡で、しゃぼん玉になって浮かぶ', motion: 'fly', fx: '🫧' },
    { t: 'と合体して、あわあわのかたまりに', motion: 'grow', fx: '🫧' },
  ] },
  bed: { name: 'ベッド', emoji: '🛏️', reactions: [
    { t: 'で羊をかぞえているうちに、眠った', motion: 'sink', fx: '💤' },
    { t: 'の上で、まくら投げ', motion: 'bounce', fx: '🪶' },
    { t: 'の下から、そっとこっちをのぞいている', motion: 'shake', fx: '👀' },
  ] },
  window: { name: '窓', emoji: '🪟', reactions: [
    { t: 'をつきやぶって、外へ飛び出した', motion: 'fly', fx: '💥' },
    { t: 'に、ぺったりはりついている', motion: 'squash', fx: '🌧️' },
    { t: 'の外のカラスと、おしゃべり', motion: 'wobble', fx: '🐦' },
  ] },
  lamp: { name: 'ランプ', emoji: '💡', reactions: [
    { t: 'にさわって、ビリビリしびれる', motion: 'shake', fx: '⚡' },
    { t: 'の光で、影がおばけみたいに大きくなる', motion: 'grow', fx: '👻' },
    { t: 'のかさに入って、いっしょに光る', motion: 'glow', fx: '💡' },
  ] },
  trunk: { name: 'トランク', emoji: '🧳', reactions: [
    { t: 'につめこまれて、ふたが閉まらない', motion: 'squash', fx: '💢' },
    { t: 'を持って、旅に出ようとしている', motion: 'dance', fx: '✈️' },
    { t: 'の中から、なぜか歌声が聞こえる', motion: 'wobble', fx: '🎵' },
  ] },
  plant: { name: '植木鉢', emoji: '🪴', reactions: [
    { t: 'に植えられて、芽が出てきた', motion: 'grow', fx: '🌱' },
    { t: 'の土にもぐって、顔だけ出している', motion: 'sink', fx: '🌿' },
    { t: 'といっしょに、水をかけられてぐんぐんのびる', motion: 'grow', fx: '💧' },
  ] },
  fountain: { name: '噴水', emoji: '⛲', reactions: [
    { t: 'のてっぺんで、水に持ち上げられている', motion: 'fly', fx: '💦' },
    { t: 'に、金貨といっしょに投げこまれた', motion: 'sink', fx: '🪙' },
    { t: 'の水で、くるくる回されている', motion: 'spin', fx: '💧' },
  ] },
  vase: { name: 'つぼ', emoji: '🏺', reactions: [
    { t: 'にすっぽりはまって、ぬけない', motion: 'shake', fx: '😵' },
    { t: 'の中から、笛の音でにょろにょろ出てくる', motion: 'wobble', fx: '🎶' },
    { t: 'にぶつかって、ガシャーン！', motion: 'squash', fx: '💥' },
  ] },
  ladder: { name: 'はしご', emoji: '🪜', reactions: [
    { t: 'をよじのぼって、てっぺんで手をふる', motion: 'fly', fx: '👋' },
    { t: 'から足をすべらせて、ドスン', motion: 'squash', fx: '💫' },
    { t: 'の段を、一段ずつぴょんぴょん', motion: 'bounce', fx: '✨' },
  ] },
  horse: { name: '木馬', emoji: '🎠', reactions: [
    { t: 'に乗って、全速力でかけだす', motion: 'dance', fx: '💨' },
    { t: 'の上でゆらゆら、船よい', motion: 'wobble', fx: '🌀' },
    { t: 'といっしょに、ぐるぐるメリーゴーラウンド', motion: 'spin', fx: '🎵' },
  ] },
  doll: { name: 'マトリョーシカ', emoji: '🪆', reactions: [
    { t: 'をあけたら、中から小さいのが出てきた', motion: 'shrink', fx: '✨' },
    { t: 'の中に閉じこめられて、ガタガタ', motion: 'shake', fx: '🔒' },
    { t: 'と並んで、いっしょに踊る', motion: 'dance', fx: '🎵' },
  ] },
  flask: { name: 'フラスコ', emoji: '⚗️', reactions: [
    { t: 'の薬を飲んで、紫色に光る', motion: 'glow', fx: '🧪' },
    { t: 'の中で、ぶくぶく泡になる', motion: 'sink', fx: '🫧' },
    { t: 'が爆発して、天井まで吹っ飛ぶ', motion: 'fly', fx: '💥' },
  ] },
  mousetrap: { name: 'ネズミとり', emoji: '🪤', reactions: [
    { t: 'に、パチンとはさまれた', motion: 'squash', fx: '💥' },
    { t: 'のチーズを、こっそり食べている', motion: 'bounce', fx: '🧀' },
    { t: 'にかかって、ネズミたちに笑われる', motion: 'shake', fx: '🐭' },
  ] },
};

// 置き場の配置（部屋の中の位置、% 指定）。道順は配列の順（時計回り）。
const LAYOUTS = [
  [[20, 28], [58, 20], [80, 62], [36, 74]],
  [[16, 60], [34, 22], [70, 26], [78, 72]],
  [[24, 22], [74, 24], [70, 72], [26, 70]],
  [[50, 20], [82, 48], [52, 78], [18, 48]],
];

export const ROOMS = [
  { id: 'entrance', name: '玄関', floor: '#4a3a30', wall: '#6d5442', furn: ['door', 'mirror', 'bell', 'statue'] },
  { id: 'parlor', name: '居間', floor: '#503238', wall: '#7a4650', furn: ['sofa', 'fireplace', 'clock', 'piano'] },
  { id: 'kitchen', name: '台所', floor: '#3e4632', wall: '#5f6b46', furn: ['pan', 'teapot', 'barrel', 'basket'] },
  { id: 'study', name: '書斎', floor: '#2f3a4e', wall: '#465a78', furn: ['bookshelf', 'telescope', 'portrait', 'drawer'] },
  { id: 'bath', name: '浴室', floor: '#2d4a4c', wall: '#437275', furn: ['bathtub', 'toilet', 'shower', 'soap'] },
  { id: 'bedroom', name: '寝室', floor: '#44365a', wall: '#654f85', furn: ['bed', 'window', 'lamp', 'trunk'] },
  { id: 'greenhouse', name: '温室', floor: '#2f4a34', wall: '#46704d', furn: ['plant', 'fountain', 'vase', 'ladder'] },
  { id: 'attic', name: '屋根裏', floor: '#4b4030', wall: '#72603f', furn: ['horse', 'doll', 'flask', 'mousetrap'] },
].map((r, i) => ({ ...r, layout: LAYOUTS[i % LAYOUTS.length] }));
