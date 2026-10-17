.PHONY: dev gen-api check test

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

# テストを実行する
test:
	uv run python -m unittest discover -s tests -t .
