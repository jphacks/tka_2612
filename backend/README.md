# backend

FastAPI で作ったバックエンド。Python と依存ライブラリは uv で管理する。

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

詳細は Swagger UI か `openapi.json` を参照。

## お酒のデータ

| ファイル | 内容 |
| --- | --- |
| `data/cocktails_source.json` | 元データ（名前・別名・説明文・材料）。522件 |
| `data/cocktails.json` | 元データに Gemini（`gemini-embedding-2`、768 次元）の埋め込みベクトルを付けたもの |

お酒の一覧は Wikipedia の「[カクテルの一覧](https://ja.wikipedia.org/wiki/カクテルの一覧)」に載っている498件（ノンアルコール含む）に、
一覧にない日本のバー・居酒屋の定番（レモンサワー、カシスウーロンなど）24件を加えたもの。
材料は各記事を参考にし、説明文（味・香り、度数の目安、合う場面・気分）は独自に書いた（Wikipedia の文章は使っていない）。

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
