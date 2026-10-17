import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  server: {
    // Dev Container のポート転送(127.0.0.1)から届くように全アドレスで待ち受ける
    host: "0.0.0.0",
  },
  resolve: {
    tsconfigPaths: true,
  },
});
