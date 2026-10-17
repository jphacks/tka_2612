.PHONY: gen-api

# FastAPI のアプリから backend/openapi.json を生成する
gen-api:
	uv run --directory backend python -m scripts.gen_openapi
