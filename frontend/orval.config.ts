import { defineConfig } from "orval";

// バックエンドの openapi.json から API クライアントを生成する
export default defineConfig({
  backend: {
    input: "../backend/openapi.json",
    output: {
      target: "app/api/generated.ts",
      client: "fetch",
      formatter: "biome",
      baseUrl: {
        runtime: "API_BASE_URL",
        imports: [{ name: "API_BASE_URL", importPath: "./config" }],
      },
    },
  },
});
