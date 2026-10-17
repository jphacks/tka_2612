.PHONY: dev gen-api check

# バックエンドの開発サーバーを起動する（http://localhost:8000）
dev:
	uv run --directory backend fastapi dev

# FastAPI のアプリから backend/openapi.json を生成する
gen-api:
	uv run --directory backend python -m scripts.gen_openapi

# バックエンドのリント・フォーマット・型をチェックする
check:
	uv run --directory backend ruff check
	uv run --directory backend ruff format --check
	uv run --directory backend ty check
