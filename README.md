# 臼井丸 釣果帖

千葉外房・大原港の釣り船「臼井丸」の釣果ブログ（https://ameblo.jp/usuimaru-tatsu/）を、
釣り物・月・午前午後・魚種で探せるようにまとめたサイトです。写真と文章は船長の許可を得て掲載しています。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | ページ本体 |
| `assets/style.css` | デザイン（和モダン・魚拓帖） |
| `assets/app.js` | 一覧・絞り込み・釣れどき帖の表示 |
| `data/posts.json` | 釣果データ（2026年8〜10月・61件） |

ビルド作業は不要です。このフォルダの中身をそのまま公開すれば動きます。

## GitHub に置く手順

1. GitHub で新しいリポジトリを作る（例：`usuimaru-catch`）。データマネジメント事例集とは別のリポジトリにする
2. リポジトリの画面で「Add file」→「Upload files」
3. このフォルダの中身（`index.html`・`README.md`・`assets` フォルダ・`data` フォルダ）をまとめてドラッグして「Commit changes」

## Netlify で公開する手順

1. Netlify で「Add new site」→「Import an existing project」→ GitHub を選ぶ
2. 上で作ったリポジトリを選ぶ
3. Build command は空欄、Publish directory は空欄のまま「Deploy」
4. 「Site configuration」→「Change site name」で名前を変えると URL が `名前.netlify.app` になる

## 釣果データの持ち方（data/posts.json）

1記事が1件です。主な項目：

- `date` / `time`：投稿日時
- `kind`：`catch`（釣果）・`notice`（出船案内・欠航など）・`event`（大会）
- `slot`：午前・午後
- `plan`：釣り物。`planEstimated` が `true` のものは出船案内が無く、内容から推定
- `catches`：数字で書かれた釣果（魚・最少〜最多の枚数・最小〜最大の重さkg）
- `others`：一緒に釣れた魚
- `note`：本文の要点
- `images`：写真（最大4枚。全体の枚数は `imageCount`）
- `url`：元の記事
