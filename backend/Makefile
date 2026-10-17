.PHONY: dev gen-api check

# 開発サーバーを起動する（http://localhost:8000）
dev:
	uv run fastapi dev

# FastAPI のアプリから openapi.json を生成する
gen-api:
	uv run python -m scripts.gen_openapi

# リント・フォーマット・型をチェックする
check:
	uv run ruff check
	uv run ruff format --check
	uv run ty check
