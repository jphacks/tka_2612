.PHONY: dev gen-api check

# 開発サーバーを起動する（http://localhost:5173）
dev:
	npm run dev

# backend/openapi.json から API クライアント（app/api/generated.ts）を生成する
gen-api:
	npx orval

# リント・フォーマット（Biome）と型（tsc）をチェックする
check:
	npx biome check
	npm run typecheck
