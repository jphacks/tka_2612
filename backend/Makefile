.PHONY: dev gen-api embed check test

# .env があれば読み込む（GEMINI_API_KEY など）
ENV_FILE := $(if $(wildcard .env),--env-file .env)

# 開発サーバーを起動する（http://localhost:8000）
dev:
	uv run $(ENV_FILE) fastapi dev

# FastAPI のアプリから openapi.json を生成する
gen-api:
	uv run python -m scripts.gen_openapi

# お酒の元データにベクトルを付けて data/cocktails.json を生成する（GEMINI_API_KEY が必要）
embed:
	uv run $(ENV_FILE) python -m scripts.embed_cocktails

# リント・フォーマット・型をチェックする
check:
	uv run ruff check
	uv run ruff format --check
	uv run ty check

# テストを実行する
test:
	uv run python -m unittest discover -s tests -t .
