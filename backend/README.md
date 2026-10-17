# backend

FastAPI で作ったバックエンド。Python と依存ライブラリは uv で管理する。

## 開発サーバーの起動

`backend/` で実行する。

```sh
make dev
```

- API: http://localhost:8000
- ドキュメント（Swagger UI）: http://localhost:8000/docs

## API（現在はモック）

固定データとインメモリ保存で動くモック。フィードバック・お気に入りはサーバー再起動で消える。

| メソッド | パス | 内容 |
| --- | --- | --- |
| GET | `/cocktails` | お酒の一覧 |
| GET | `/cocktails/{cocktail_id}` | お酒の詳細 |
| POST | `/recommendations` | おすすめ上位5件（multipart: `query`, 任意で `image`） |
| POST | `/feedback` | 👍/👎 を付ける |
| GET / POST | `/favorites` | お気に入りの一覧・登録 |
| DELETE | `/favorites/{cocktail_id}` | お気に入りの解除 |
| GET | `/stats` | 店舗向けの集計 |

詳細は Swagger UI か `openapi.json` を参照。

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
