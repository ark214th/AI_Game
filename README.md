# AI_Game

AIで制作したブラウザゲームをまとめるリポジトリです。

## 構成

- `index.html` — ゲーム一覧
- `games/sky-turbo-racers/` — スカイターボ・レーサーズ
- `games/survivor/` — 月影サバイバー
- `games/starfall-waltz/` — STARFALL WALTZ（ボス戦中心の弾幕シューティング）
- `games/punyu-kirakira/` — ぷにゅの きらきらランド（小学1年生向けの横スクロールアクション）
- `games/fushigi-pet-hotel/` — ふしぎな ペットホテル（小学1年生向けのお世話・かざりつけゲーム）

各ゲームは `games/` 以下の個別フォルダに配置します。

## 開発者モード

トップページのタイトル「AI Game Library」を2秒以内に5回タップすると開発者モードが切りかわり、ページの下に「開発中・非掲載」のゲーム（`games/mnemo-manor/` など）が表示される。設定はその端末のブラウザに保存される。URL に `?dev=1`（オン）/ `?dev=0`（オフ）を付けても切りかえられる。

開発中のゲームは、完成してから通常の一覧へ移す（進め方は [CLAUDE.md](CLAUDE.md)）。
