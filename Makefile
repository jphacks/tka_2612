.PHONY: dev gen-api

# バックエンドの開発サーバーを起動する（http://localhost:8000）
dev:
	uv run --directory backend fastapi dev

# FastAPI のアプリから backend/openapi.json を生成する
gen-api:
	uv run --directory backend python -m scripts.gen_openapi
