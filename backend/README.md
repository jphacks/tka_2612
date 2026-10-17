# backend

FastAPI で作ったバックエンド。Python と依存ライブラリは uv で管理する。

## 開発サーバーの起動

`backend/` で実行する。

```sh
make dev
```

- API: http://localhost:8000
- ドキュメント（Swagger UI）: http://localhost:8000/docs

## openapi.json の生成

`backend/` で実行する。`openapi.json` が上書きされる。

```sh
make gen-api
```

API を変更したら生成し直して、一緒にコミットする。続けて `frontend/` でも `make gen-api` を実行すると、フロントエンドの API クライアント（`frontend/app/api/generated.ts`）が更新される。

## チェック

`backend/` で実行する。ruff（リント・フォーマット）と ty（型）でチェックする。

```sh
make check
```

フォーマットの崩れは `uv run ruff format` で直せる。
