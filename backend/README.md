# backend

FastAPI で作ったバックエンド。Python と依存ライブラリは uv で管理する。

## Gemini の API キー

おすすめ・検索（入力文のベクトル化）と、メニューの写真の読み取りで Gemini API を使う。Google AI Studio（https://aistudio.google.com/apikey）でキーを発行し、
`backend/.env` に書く（`.env` はコミットしない）。`make dev` で自動的に読み込まれる。

```sh
cp .env.example .env   # GEMINI_API_KEY を書く
```

無料枠には1分あたりの回数制限があり、超えると API は 503 を返す。

ブラウザのフロントエンドから呼べるよう、CORS で `http://localhost:5173` を許可している。別のオリジンから呼ぶときは、`.env` の `CORS_ORIGINS`（カンマ区切り）で指定する。

## 開発サーバーの起動

`backend/` で実行する。

```sh
make dev
```

- API: http://localhost:8000
- ドキュメント（Swagger UI）: http://localhost:8000/docs

## API

| メソッド | パス | 内容 |
| --- | --- | --- |
| GET | `/cocktails` | お酒の一覧 |
| GET | `/cocktails/{cocktail_id}` | お酒の詳細 |
| POST | `/cocktails/search` | 入力文をベクトル化し、ベクトルが近い順にお酒を100件返す |
| POST | `/menu/scan` | メニューの写真から、お酒の名前と写真上の位置を AI（Gemini）で読み取る |
| POST | `/menu/match` | メニューのお酒の名前を、データベースのお酒と照合する |
| POST | `/recommendations` | 入力文（味・気分）に合うお酒を上位5件返す。候補をメニュー内に絞れる |
| POST | `/favorites` | お気に入りに登録する（お気に入りの総数を返す） |
| DELETE | `/favorites/{cocktail_id}` | お気に入りを解除する（お気に入りの総数を返す） |
| GET | `/favorites` | 端末のお気に入りの一覧 |
| GET | `/favorites/counts` | お気に入りの総数が多い順のお酒 |
| GET | `/store/queries` | 店舗向け：よく求められた味（おすすめで入力された文）を多い順に返す |

詳細は Swagger UI か `openapi.json` を参照。

## お酒のデータ

| ファイル | 内容 |
| --- | --- |
| `data/cocktails_source.json` | 元データ（名前・別名・説明文・材料・ベース）。522件 |
| `data/cocktails.json` | 元データに Gemini（`gemini-embedding-2`、768 次元）の埋め込みベクトルを付けたもの |
| `data/bases_source.json` | ベースのお酒（ジン・ラム・ウォッカなど）の元データ（名前・別名・説明文）。13件 |
| `data/bases.json` | ベースの元データに、カクテルと同じモデルの埋め込みベクトルを付けたもの |

お酒の一覧は Wikipedia の「[カクテルの一覧](https://ja.wikipedia.org/wiki/カクテルの一覧)」に載っている498件（ノンアルコール含む）に、
一覧にない日本のバー・居酒屋の定番（レモンサワー、カシスウーロンなど）24件を加えたもの。
材料は各記事を参考にし、説明文（味・香り、度数の目安、合う場面・気分）は独自に書いた（Wikipedia の文章は使っていない）。

### ベース

各カクテルの `bases` に、ベースのお酒のID（`gin`、`rum` など）が入る（複数のこともある。ノンアルコールは空）。
ベースは Wikipedia の分類と同じ13種類（ウイスキー・ウォッカ・ジン・テキーラ・ブランデー・ラム・アクアビット・焼酎・その他の蒸留酒・日本酒・ビール・ワイン・リキュール）。
一覧で分類されているカクテルはその分類を使い、分類が判別しにくいものと一覧にない24件は、材料から判定した。
ベースにも説明文を付け、カクテルと同じモデルでベクトル化している（入力文と比べられる）。

### メニューの写真の読み取り

`POST /menu/scan` は、写真を Gemini（`gemini-3.8-flash`）に渡し、載っているお酒の名前と、その名前が書かれている位置を返させる。
位置は名前の中心を、写真の幅・高さに対する %（0〜100）で返す（読み取れなかったときは null）。
API キーをブラウザに渡さないため、Gemini はフロントエンドから直接呼ばず、必ずこの API を通す。

### メニューの名前の照合

`POST /menu/match` は、名前と別名の表記ゆれ（中黒・長音・全角半角・大文字小文字・価格・括弧の補足）をそろえて完全一致を探し、
なければ `difflib` のあいまい一致（類似度 0.8 以上）で探す。どれにも一致しない名前は `unregistered` に入る。

### おすすめ

`POST /recommendations` は、入力文を Gemini（`gemini-embedding-2`）でベクトルにし、お酒の説明文のベクトルとの
コサイン類似度の高い順に5件返す。`cocktail_ids` に `/menu/match` で照合したお酒のIDを渡すと、メニュー内のお酒だけから選ぶ。
同じ入力文のベクトルはメモリに保持して再利用する（無料枠の節約。サーバーを再起動すると消える）。

写真を使う流れ: `/menu/scan`（写真 → 名前と位置）→ `/menu/match`（名前 → お酒のID）→ `/recommendations`（ID と入力文 → おすすめ）

### お気に入り

ログインはなく、ブラウザごとのランダムな端末ID（`device_id`）で記録する。個人情報は持たない。
お気に入りとお酒ごとの総数は SQLite（既定は `data/app.db`、環境変数 `DATABASE_PATH` で変更できる）に保存する。
総数は登録・解除と同じトランザクションで更新する。DB ファイルはコミットしない。

### お酒の検索

`POST /cocktails/search` は、入力文を `gemini-embedding-2` でベクトル化し、データベース全体から、
お酒の説明文のベクトルとのコサイン類似度が高い順（ベクトルが近い順）に100件返す。
おすすめ（上位5件、候補をメニュー内に絞れる）と同じ計算で、入力文のベクトルも同じく保持して再利用する。
店舗向けの集計には記録しない。

### 店舗向けの集計

店舗が仕入れやメニュー作りの参考にするための集計。
- お酒ごとの人気: `GET /favorites/counts`（お気に入りの総数が多い順）
- よく求められた味: `GET /store/queries`（おすすめで入力された文が多い順。`limit` で件数、`days` で直近何日分かを指定できる）

入力文は、おすすめを返せたときに SQLite の `queries` テーブルに記録する。全角半角と空白の違いはそろえて数える。誰が入力したかは記録しない。

### ベクトルの作り直し

元データ（`data/cocktails_source.json`・`data/bases_source.json`）を変えたら、`backend/` で次を実行し、ベクトル付きのファイルも一緒にコミットする。
名前と説明文が変わっていないお酒は前回のベクトルを使い回すので、Gemini に送るのは変えた分だけになる。
ベクトル付きのファイルは1件1行の JSON で書き出すので、Git の差分は変えた件の行だけになる（GitHub の PR では生成物として折りたたまれる）。

```sh
make embed
```

## openapi.json の生成

`backend/` で実行する。`openapi.json` が上書きされる。

```sh
make gen-api
```

API を変更したら生成し直して、一緒にコミットする。続けて `frontend/` でも `make gen-api` を実行すると、フロントエンドの API クライアント（`frontend/app/api/generated.ts`）が更新される。

## テスト

`backend/` で実行する。標準ライブラリの unittest で `tests/` のテストを実行する。

```sh
make test
```

## チェック

`backend/` で実行する。ruff（リント・フォーマット）と ty（型）でチェックする。

```sh
make check
```

フォーマットの崩れは `uv run ruff format` で直せる。
